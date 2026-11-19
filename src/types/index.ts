// ========== Wikipedia 数据 ==========
export interface WikiSearchResult {
  id: number;
  key: string;
  title: string;
  excerpt?: string;
  description?: string | null;
  thumbnailUrl?: string;
  language: string;
}

export interface WikiImage {
  source: string;
  width: number;
  height: number;
}

export interface WikiSummary {
  type: string;
  title: string;
  displaytitle?: string;
  pageid?: number;
  description?: string;
  extract: string;
  thumbnail?: WikiImage;
  originalimage?: WikiImage;
  content_urls: {
    desktop: { page: string };
    mobile?: { page: string };
  };
  wikibase_item?: string;
  revision?: string;
  lang?: string;
}

export interface WikiPageDetail {
  id: number;
  key: string;
  title: string;
  latest?: { id: number; timestamp: string };
  content_model?: string;
  license?: { url: string; title: string };
  html_url?: string;
}

export interface WikiLanguageLink {
  code: string;
  name: string;
  key: string;
  title: string;
}

export interface ImageLicenseInfo {
  fileTitle: string;
  descriptionUrl?: string;
  license?: string;
  licenseUrl?: string;
  artist?: string;
  credit?: string;
}

export interface TrendingArticle {
  pageId: number;
  title: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  wikiUrl: string;
  views?: number;
  language: string;
}

// ========== 卡牌 ==========
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface WikiCard {
  id: string; // 语言代码:pageId
  pageId: number;
  title: string;
  englishTitle?: string;
  description: string;
  extract: string;
  funFact?: string;

  category: string;
  packId?: string;
  rarity: Rarity;

  imageUrl?: string;
  originalImageUrl?: string;
  imageSourceUrl?: string; // Commons 文件页
  imageLicense?: string;

  wikiUrl: string;
  wikiLanguage: string;

  wikibaseItem?: string;

  revisionId?: number;
  sourceLicense?: string;

  createdAt: number;
}

export interface CollectionRecord {
  cardId: string;
  count: number;
  firstObtainedAt: number;
  lastObtainedAt: number;
}

export interface OwnedCard extends WikiCard {
  count: number;
  firstObtainedAt: number;
  lastObtainedAt: number;
}

export interface PackHistory {
  id: string;
  packId: string;
  cardIds: string[];
  createdAt: number;
  highestRarity: Rarity;
  newCardCount: number;
  duplicateCount: number;
}

export interface GameStats {
  id: 'main';
  totalOpens: number;
  totalCards: number;
  epicPity: number;
  legendaryPity: number;
  mythicPity: number;
  lastOpenDate: string;
  dailyOpenedCount: number;
}

export interface GameSettings {
  animations: boolean;
  sound: boolean;
  language: 'zh' | 'en';
}

export interface ApiCacheRecord {
  key: string;
  value: unknown;
  expiresAt: number;
  updatedAt: number;
}

// ========== 卡包 ==========
export interface CardPack {
  id: string;
  name: string;
  description: string;
  coverTheme: string;
  category: string;
  searchQueries: string[];
  /** 其他语言的搜索关键词（可选） */
  localizedQueries?: Record<string, string[]>;
  language: string;
  enabled: boolean;
  /** 随机盲盒 */
  random?: boolean;
  accent: string;
}

export interface OpenPackResult {
  history: PackHistory;
  cards: WikiCard[];
  newFlags: boolean[];
  counts: number[];
}

// ========== 存档 ==========
export interface GameSave {
  version: number;
  exportedAt: string;
  cards: WikiCard[];
  collection: CollectionRecord[];
  packHistory: PackHistory[];
  stats: {
    totalOpens: number;
    totalCards: number;
    epicPity: number;
    legendaryPity: number;
    mythicPity: number;
    lastOpenDate: string;
    dailyOpenedCount: number;
  };
  settings?: Partial<GameSettings>;
}
