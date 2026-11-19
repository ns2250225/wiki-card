import { PACKS, RANDOM_PACK, THEME_PACKS, getPackConfig, getPackQueries } from '@/config/packs';
import type { CardPack } from '@/types';
import { pick } from '@/utils/random';

export { PACKS, RANDOM_PACK, THEME_PACKS, getPackConfig, getPackQueries };

export function listPacks(): CardPack[] {
  return PACKS.filter((p) => p.enabled);
}

/** 首页「今日免费卡包」：随机一个主题卡包 */
export function pickFeaturedPack(): CardPack {
  return pick(THEME_PACKS);
}

export function packName(id: string): string {
  return getPackConfig(id)?.name ?? id;
}
