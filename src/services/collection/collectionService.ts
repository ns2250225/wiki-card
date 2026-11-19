import type { CollectionRecord, OwnedCard, PackHistory, Rarity, WikiCard } from '@/types';
import { db } from '@/database/db';
import { RARITIES } from '@/config/rarity';

export function mergeOwned(card: WikiCard, rec?: CollectionRecord): OwnedCard {
  return {
    ...card,
    count: rec?.count ?? 0,
    firstObtainedAt: rec?.firstObtainedAt ?? 0,
    lastObtainedAt: rec?.lastObtainedAt ?? 0,
  };
}

/** 所有已发现卡牌（含未收集：在分享页等处见过但尚未抽到） */
export async function getAllCards(): Promise<OwnedCard[]> {
  const [cards, cols] = await Promise.all([db.cards.toArray(), db.collection.toArray()]);
  const map = new Map(cols.map((c) => [c.cardId, c]));
  return cards.map((c) => mergeOwned(c, map.get(c.id)));
}

export async function getCard(id: string): Promise<OwnedCard | undefined> {
  const [card, rec] = await Promise.all([db.cards.get(id), db.collection.get(id)]);
  return card ? mergeOwned(card, rec) : undefined;
}

export async function getCardsByIds(ids: string[]): Promise<(OwnedCard | undefined)[]> {
  const [cards, recs] = await Promise.all([db.cards.bulkGet(ids), db.collection.bulkGet(ids)]);
  return cards.map((c, i) => (c ? mergeOwned(c, recs[i]) : undefined));
}

export async function updateCard(id: string, patch: Partial<WikiCard>): Promise<void> {
  await db.cards.update(id, patch);
}

/**
 * 保存在分享页等处"见过"的卡牌（未收集）。已存在的卡牌不覆盖。
 * 未收集卡牌的稀有度仅为展示，第一次真正获得时会重新确定。
 */
export async function rememberSeenCards(cards: WikiCard[]): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    for (const c of cards) {
      const exists = await db.cards.get(c.id);
      if (!exists) await db.cards.put(c);
    }
  });
}

export async function getPackHistory(limit?: number): Promise<PackHistory[]> {
  const q = db.packHistory.orderBy('createdAt').reverse();
  return limit ? q.limit(limit).toArray() : q.toArray();
}

export async function getPackRecord(id: string): Promise<PackHistory | undefined> {
  return db.packHistory.get(id);
}

export interface CollectionStats {
  discovered: number; // 累计发现知识数量（已收集的不同卡牌）
  seen: number; // 见过但未收集
  totalObtained: number; // 获得卡牌总张数
  duplicates: number; // 重复获得数量
  categories: number; // 已探索知识领域数量
  byRarity: Record<Rarity, number>;
  byCategory: Record<string, number>;
}

export function computeStats(cards: OwnedCard[]): CollectionStats {
  const owned = cards.filter((c) => c.count > 0);
  const byRarity = Object.fromEntries(RARITIES.map((r) => [r.id, 0])) as Record<Rarity, number>;
  const byCategory: Record<string, number> = {};
  for (const c of owned) {
    byRarity[c.rarity]++;
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
  }
  const totalObtained = owned.reduce((a, c) => a + c.count, 0);
  return {
    discovered: owned.length,
    seen: cards.length - owned.length,
    totalObtained,
    duplicates: totalObtained - owned.length,
    categories: Object.keys(byCategory).length,
    byRarity,
    byCategory,
  };
}
