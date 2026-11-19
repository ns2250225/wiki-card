import type Dexie from 'dexie';
import type { GameSave } from '@/types';

/**
 * IndexedDB 结构版本。新增版本时在下方追加 db.version(n)，不要修改旧版本。
 */
export function applySchema(db: Dexie) {
  db.version(1).stores({
    cards: 'id, pageId, wikiLanguage, rarity, category, createdAt, title',
    collection: 'cardId, count, firstObtainedAt, lastObtainedAt',
    packHistory: 'id, packId, createdAt',
    apiCache: 'key, expiresAt',
    gameStats: 'id',
    settings: 'key',
  });

  // v2：为卡牌增加 packId 索引，便于按卡包统计
  db.version(2)
    .stores({
      cards: 'id, pageId, wikiLanguage, rarity, category, packId, createdAt, title',
    })
    .upgrade(async (tx) => {
      await tx
        .table('cards')
        .toCollection()
        .modify((card: { category?: string }) => {
          if (!card.category) card.category = '综合';
        });
    });
}

/** 存档文件版本 */
export const SAVE_VERSION = 1;

/**
 * 存档数据迁移：将旧版本存档升级到当前版本。
 * 未来版本变化时在此追加迁移步骤。
 */
export function migrateSave(raw: GameSave): GameSave {
  const save = { ...raw };
  // 版本 0（早期草案）：无版本号
  if (!save.version || save.version < 1) save.version = 1;
  // 所有版本：补全缺失字段
  const s = (save.stats ?? {}) as Partial<GameSave['stats']>;
  save.stats = {
    totalOpens: Number(s.totalOpens) || 0,
    totalCards: Number(s.totalCards) || 0,
    epicPity: Number(s.epicPity) || 0,
    legendaryPity: Number(s.legendaryPity) || 0,
    mythicPity: Number(s.mythicPity) || 0,
    lastOpenDate: typeof s.lastOpenDate === 'string' ? s.lastOpenDate : '',
    dailyOpenedCount: Number(s.dailyOpenedCount) || 0,
  };
  save.packHistory = Array.isArray(save.packHistory) ? save.packHistory : [];
  save.exportedAt = typeof save.exportedAt === 'string' ? save.exportedAt : '';
  return save;
}
