import type { OpenPackResult, PackHistory, Rarity, WikiCard } from '@/types';
import { db, getStats } from '@/database/db';
import { CARDS_PER_PACK, highestRarity } from '@/config/rarity';
import { getPackConfig } from '@/config/packs';
import { uid } from '@/utils/random';
import { RequestBudget } from '@/services/wikipedia/client';
import { generatePack, type GenerateProgress } from '@/services/card/cardGenerator';
import { applyPity, rollRarity, type PityState } from '@/services/card/rarityGenerator';
import { NoFreePacksError, OfflineError, normalizeDaily, remainingFreePacks } from './packService';

export interface OpenPackOptions {
  language: string;
  onProgress?: (p: GenerateProgress) => void;
}

/** 单次开包最多请求次数 */
const REQUEST_BUDGET_PER_PACK = 45;

/**
 * 完整开包流程：
 * 检查免费次数 → 调用 Wikipedia API 动态获取 5 张卡牌 → 分配稀有度（含保底）→ 保存（事务）
 * 只有成功生成并保存 5 张卡牌后才扣除一次免费次数。
 */
export async function openPack(packId: string, opts: OpenPackOptions): Promise<OpenPackResult> {
  const pack = getPackConfig(packId);
  if (!pack) throw new Error('卡包不存在');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OfflineError();

  const before = await getStats();
  if (remainingFreePacks(before) <= 0) throw new NoFreePacksError();

  const ownedIds = new Set((await db.collection.toCollection().primaryKeys()) as string[]);
  const generated = await generatePack(packId, CARDS_PER_PACK, {
    language: opts.language,
    budget: new RequestBudget(REQUEST_BUDGET_PER_PACK),
    ownedIds,
    onProgress: opts.onProgress,
  });

  return db.transaction('rw', [db.cards, db.collection, db.packHistory, db.gameStats], async () => {
    const stats = normalizeDaily(await getStats());
    if (remainingFreePacks(stats) <= 0) throw new NoFreePacksError();

    let pity: PityState = {
      epicPity: stats.epicPity,
      legendaryPity: stats.legendaryPity,
      mythicPity: stats.mythicPity,
    };
    const now = Date.now();
    const finalCards: WikiCard[] = [];
    const newFlags: boolean[] = [];
    const counts: number[] = [];

    for (const card of generated) {
      const [existingCard, existingCol] = await Promise.all([
        db.cards.get(card.id),
        db.collection.get(card.id),
      ]);
      let rarity: Rarity;
      let finalCard: WikiCard;
      if (existingCard && existingCol) {
        // 重复获得：沿用第一次获得时的稀有度，刷新来自 API 的内容
        rarity = existingCard.rarity;
        finalCard = {
          ...existingCard,
          ...card,
          rarity,
          category: existingCard.category || card.category,
          createdAt: existingCard.createdAt,
          imageLicense: existingCard.imageLicense,
        };
      } else {
        rarity = rollRarity(pity);
        finalCard = { ...card, rarity, createdAt: now };
      }
      pity = applyPity(pity, rarity);

      const count = (existingCol?.count ?? 0) + 1;
      await db.cards.put(finalCard);
      await db.collection.put({
        cardId: finalCard.id,
        count,
        firstObtainedAt: existingCol?.firstObtainedAt ?? now,
        lastObtainedAt: now,
      });
      finalCards.push(finalCard);
      newFlags.push(!existingCol);
      counts.push(count);
    }

    const history: PackHistory = {
      id: uid('pack'),
      packId,
      cardIds: finalCards.map((c) => c.id),
      createdAt: now,
      highestRarity: highestRarity(finalCards.map((c) => c.rarity)),
      newCardCount: newFlags.filter(Boolean).length,
      duplicateCount: newFlags.filter((f) => !f).length,
    };
    await db.packHistory.put(history);
    await db.gameStats.put({
      ...stats,
      ...pity,
      totalOpens: stats.totalOpens + 1,
      totalCards: stats.totalCards + finalCards.length,
      dailyOpenedCount: stats.dailyOpenedCount + 1,
    });

    return { history, cards: finalCards, newFlags, counts };
  });
}
