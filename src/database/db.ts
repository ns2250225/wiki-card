import Dexie, { type Table } from 'dexie';
import type { ApiCacheRecord, CollectionRecord, GameStats, PackHistory, WikiCard } from '@/types';
import { applySchema } from './migrations';

export interface SettingRecord {
  key: string;
  value: unknown;
}

/**
 * 本地数据库。
 * 注意：cards 表只保存用户实际发现的卡牌，不在初始化时导入任何知识卡牌。
 */
export class WikiCardDB extends Dexie {
  cards!: Table<WikiCard, string>;
  collection!: Table<CollectionRecord, string>;
  packHistory!: Table<PackHistory, string>;
  apiCache!: Table<ApiCacheRecord, string>;
  gameStats!: Table<GameStats, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('wikicard');
    applySchema(this);
  }
}

export const db = new WikiCardDB();

export function defaultStats(): GameStats {
  return {
    id: 'main',
    totalOpens: 0,
    totalCards: 0,
    epicPity: 0,
    legendaryPity: 0,
    mythicPity: 0,
    lastOpenDate: '',
    dailyOpenedCount: 0,
  };
}

export async function getStats(): Promise<GameStats> {
  return (await db.gameStats.get('main')) ?? defaultStats();
}
