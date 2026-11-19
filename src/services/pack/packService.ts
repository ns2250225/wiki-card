import type { GameStats } from '@/types';
import { DAILY_FREE_PACKS } from '@/config/rarity';
import { localDateString } from '@/utils/date';

/**
 * 每日免费机制：每日 3 次，按浏览器本地日期重置，开包成功后才扣除。
 */
export function normalizeDaily(stats: GameStats, today = localDateString()): GameStats {
  if (stats.lastOpenDate !== today) {
    return { ...stats, lastOpenDate: today, dailyOpenedCount: 0 };
  }
  return stats;
}

export function remainingFreePacks(stats: GameStats, today = localDateString()): number {
  if (stats.lastOpenDate !== today) return DAILY_FREE_PACKS;
  return Math.max(0, DAILY_FREE_PACKS - stats.dailyOpenedCount);
}

export class NoFreePacksError extends Error {
  constructor() {
    super('今日免费卡包已用完，明天再来探索吧');
    this.name = 'NoFreePacksError';
  }
}

export class OfflineError extends Error {
  constructor() {
    super('当前处于离线状态，无法从 Wikipedia 发现新知识');
    this.name = 'OfflineError';
  }
}
