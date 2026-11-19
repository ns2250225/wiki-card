import type { Rarity } from '@/types';

export interface RarityConfig {
  id: Rarity;
  name: string;
  label: string;
  probability: number;
  color: string;
  rank: number;
}

export const RARITIES: RarityConfig[] = [
  { id: 'common', name: '普通', label: 'COMMON', probability: 0.55, color: '#A5A9B5', rank: 0 },
  { id: 'rare', name: '稀有', label: 'RARE', probability: 0.25, color: '#398BFF', rank: 1 },
  { id: 'epic', name: '史诗', label: 'EPIC', probability: 0.13, color: '#A45CFF', rank: 2 },
  { id: 'legendary', name: '传说', label: 'LEGENDARY', probability: 0.06, color: '#FFC247', rank: 3 },
  { id: 'mythic', name: '神话', label: 'MYTHIC', probability: 0.01, color: '#FF5DB7', rank: 4 },
];

export const RARITY_MAP: Record<Rarity, RarityConfig> = Object.fromEntries(
  RARITIES.map((r) => [r.id, r]),
) as Record<Rarity, RarityConfig>;

/** 保底：连续 N 张未获得对应稀有度及以上 */
export const PITY = {
  epic: 20,
  legendary: 50,
  mythic: 100,
};

export const CARDS_PER_PACK = 5;
export const DAILY_FREE_PACKS = 3;

export function rarityRank(r: Rarity): number {
  return RARITY_MAP[r]?.rank ?? 0;
}

export function highestRarity(list: Rarity[]): Rarity {
  return list.reduce<Rarity>((best, r) => (rarityRank(r) > rarityRank(best) ? r : best), 'common');
}

export function isRarity(v: unknown): v is Rarity {
  return typeof v === 'string' && v in RARITY_MAP;
}
