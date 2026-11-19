import { db, defaultStats, getStats } from './db';
import { migrateSave, SAVE_VERSION } from './migrations';
import type { CollectionRecord, GameSave, GameSettings, PackHistory, WikiCard } from '@/types';
import { isRarity } from '@/config/rarity';
import { localDateString } from '@/utils/date';
import { validateCardRecord } from '@/services/card/cardValidator';

export async function buildSave(): Promise<GameSave> {
  const [cards, collection, packHistory, stats, settingsRows] = await Promise.all([
    db.cards.toArray(),
    db.collection.toArray(),
    db.packHistory.orderBy('createdAt').toArray(),
    getStats(),
    db.settings.toArray(),
  ]);
  const settings: Partial<GameSettings> = {};
  for (const row of settingsRows) (settings as Record<string, unknown>)[row.key] = row.value;
  return {
    version: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    cards,
    collection,
    packHistory,
    stats: {
      totalOpens: stats.totalOpens,
      totalCards: stats.totalCards,
      epicPity: stats.epicPity,
      legendaryPity: stats.legendaryPity,
      mythicPity: stats.mythicPity,
      lastOpenDate: stats.lastOpenDate,
      dailyOpenedCount: stats.dailyOpenedCount,
    },
    settings,
  };
}

/** 导出存档并触发下载 wikicard-save-YYYY-MM-DD.json */
export async function exportSave(): Promise<string> {
  const save = await buildSave();
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const filename = `wikicard-save-${localDateString()}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}

export interface SaveValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  save?: GameSave;
  summary?: {
    version: number;
    exportedAt: string;
    cardCount: number;
    collectedCount: number;
    totalObtained: number;
    packCount: number;
    totalOpens: number;
  };
}

const CARD_ID_RE = /^[a-z][a-z0-9-]{1,15}:\d+$/;

/** 验证存档：JSON 格式、版本号、卡牌字段、卡牌 ID */
export function validateSave(text: string): SaveValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['文件不是有效的 JSON 格式'], warnings };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['存档结构无效'], warnings };
  }
  const obj = raw as Partial<GameSave>;
  if (typeof obj.version !== 'number') errors.push('缺少版本号 version');
  else if (obj.version > SAVE_VERSION) errors.push(`存档版本 ${obj.version} 高于当前支持的版本 ${SAVE_VERSION}`);
  if (!Array.isArray(obj.cards)) errors.push('缺少卡牌数据 cards');
  if (!Array.isArray(obj.collection)) errors.push('缺少收藏数据 collection');
  if (errors.length) return { ok: false, errors, warnings };

  const save = migrateSave(obj as GameSave);

  const cardIds = new Set<string>();
  const validCards: WikiCard[] = [];
  save.cards.forEach((c, i) => {
    const problem = validateCardRecord(c);
    if (problem) {
      errors.push(`第 ${i + 1} 张卡牌无效：${problem}`);
      return;
    }
    if (!CARD_ID_RE.test(c.id) || c.id !== `${c.wikiLanguage}:${c.pageId}`) {
      errors.push(`卡牌 ID 无效：${c.id}`);
      return;
    }
    if (cardIds.has(c.id)) {
      warnings.push(`重复的卡牌 ID 已合并：${c.id}`);
      return;
    }
    cardIds.add(c.id);
    validCards.push(c);
  });

  const validCollection: CollectionRecord[] = [];
  for (const r of save.collection) {
    if (!r || typeof r.cardId !== 'string' || typeof r.count !== 'number' || r.count < 1) {
      errors.push('收藏记录格式无效');
      break;
    }
    if (!cardIds.has(r.cardId)) {
      warnings.push(`收藏记录引用了不存在的卡牌，已忽略：${r.cardId}`);
      continue;
    }
    validCollection.push({
      cardId: r.cardId,
      count: Math.floor(r.count),
      firstObtainedAt: Number(r.firstObtainedAt) || Date.now(),
      lastObtainedAt: Number(r.lastObtainedAt) || Date.now(),
    });
  }

  const validHistory: PackHistory[] = [];
  for (const h of save.packHistory ?? []) {
    if (!h || typeof h.id !== 'string' || !Array.isArray(h.cardIds)) {
      warnings.push('跳过一条无效的开包记录');
      continue;
    }
    validHistory.push({
      ...h,
      highestRarity: isRarity(h.highestRarity) ? h.highestRarity : 'common',
    });
  }

  if (errors.length) return { ok: false, errors, warnings };

  const cleaned: GameSave = {
    ...save,
    cards: validCards,
    collection: validCollection,
    packHistory: validHistory,
  };
  return {
    ok: true,
    errors,
    warnings,
    save: cleaned,
    summary: {
      version: obj.version as number,
      exportedAt: save.exportedAt,
      cardCount: validCards.length,
      collectedCount: validCollection.length,
      totalObtained: validCollection.reduce((a, r) => a + r.count, 0),
      packCount: validHistory.length,
      totalOpens: save.stats.totalOpens,
    },
  };
}

/** 覆盖当前数据，恢复 IndexedDB（必须同时恢复卡牌基础信息） */
export async function importSave(save: GameSave): Promise<void> {
  await db.transaction('rw', [db.cards, db.collection, db.packHistory, db.gameStats, db.settings], async () => {
    await Promise.all([db.cards.clear(), db.collection.clear(), db.packHistory.clear(), db.gameStats.clear()]);
    await db.cards.bulkPut(save.cards);
    await db.collection.bulkPut(save.collection);
    await db.packHistory.bulkPut(save.packHistory);
    await db.gameStats.put({ ...defaultStats(), ...save.stats, id: 'main' });
    if (save.settings) {
      for (const [key, value] of Object.entries(save.settings)) {
        await db.settings.put({ key, value });
      }
    }
  });
}

/** 清空所有游戏数据 */
export async function resetAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.cards, db.collection, db.packHistory, db.gameStats, db.apiCache, db.settings],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.collection.clear(),
        db.packHistory.clear(),
        db.gameStats.clear(),
        db.apiCache.clear(),
        db.settings.clear(),
      ]);
    },
  );
}
