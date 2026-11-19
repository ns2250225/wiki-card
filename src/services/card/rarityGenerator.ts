import type { Rarity } from '@/types';
import { PITY, RARITIES, rarityRank } from '@/config/rarity';
import { weightedPick } from '@/utils/random';

export interface PityState {
  epicPity: number;
  legendaryPity: number;
  mythicPity: number;
}

/** 按概率随机稀有度 */
export function rollNaturalRarity(): Rarity {
  return weightedPick(
    RARITIES.map((r) => r.id),
    RARITIES.map((r) => r.probability),
  );
}

/**
 * 随机稀有度并应用保底：
 * - 连续 20 张未获得史诗及以上 → 第 20 张至少史诗
 * - 连续 50 张未获得传说及以上 → 第 50 张至少传说
 * - 连续 100 张未获得神话 → 第 100 张必为神话
 */
export function rollRarity(state: PityState): Rarity {
  let rarity = rollNaturalRarity();
  let required: Rarity = 'common';
  if (state.mythicPity + 1 >= PITY.mythic) required = 'mythic';
  else if (state.legendaryPity + 1 >= PITY.legendary) required = 'legendary';
  else if (state.epicPity + 1 >= PITY.epic) required = 'epic';
  if (rarityRank(rarity) < rarityRank(required)) rarity = required;
  return rarity;
}

/** 根据实际获得的稀有度更新保底计数（以卡牌张数为单位） */
export function applyPity(state: PityState, rarity: Rarity): PityState {
  const rank = rarityRank(rarity);
  return {
    epicPity: rank >= rarityRank('epic') ? 0 : state.epicPity + 1,
    legendaryPity: rank >= rarityRank('legendary') ? 0 : state.legendaryPity + 1,
    mythicPity: rarity === 'mythic' ? 0 : state.mythicPity + 1,
  };
}
