import type { WikiCard, WikiSummary } from '@/types';
import { isRarity } from '@/config/rarity';

/** 不适合制作卡牌的标题 */
const BAD_TITLE_PATTERNS = [
  /列表$/,
  /列表[（(]/,
  /^.*?一览/,
  /年表$/,
  /消歧义/,
  /^List of/i,
  /^Lists of/i,
  /^Index of/i,
  /^Outline of/i,
  /^Timeline of/i,
  /\(disambiguation\)/i,
  /^\d{1,4}年$/,
  /^前?\d{1,4}年代?$/,
  /^\d{1,2}月\d{1,2}日$/,
  /^\d{3,4}$/,
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/,
];

/** 不适合展示的描述 */
const BAD_DESCRIPTION_PATTERNS = [
  /维基媒体(列表|消歧义|分类|模板)/,
  /维基百科(列表|消歧义)/,
  /Wikimedia (list|disambiguation|category|template)/i,
  /Topics referred to by the same term/i,
];

/** 随机内容的基础过滤（避免不适合的条目） */
const BLOCKED_WORDS = [
  '色情',
  '成人影片',
  'AV女优',
  '性行为',
  '自杀方法',
  'porn',
  'pornographic',
  'sex act',
  'erotic',
  'hentai',
];

export function isAcceptableTitle(title: string): boolean {
  if (!title || title.length > 80) return false;
  if (BAD_TITLE_PATTERNS.some((re) => re.test(title))) return false;
  const lower = title.toLowerCase();
  return !BLOCKED_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

/**
 * 检查文章摘要是否适合生成卡牌：跳过消歧义页、列表页、无摘要页等
 */
export function isValidSummary(s: WikiSummary | undefined | null): s is WikiSummary {
  if (!s) return false;
  if (s.type !== 'standard') return false;
  if (!s.title || !isAcceptableTitle(s.title)) return false;
  if (!s.content_urls?.desktop?.page) return false;
  const extract = (s.extract ?? '').trim();
  const minLen = /[一-鿿]/.test(extract) ? 20 : 50;
  if (extract.length < minLen) return false;
  if (s.description && BAD_DESCRIPTION_PATTERNS.some((re) => re.test(s.description!))) return false;
  const lower = `${s.description ?? ''} ${extract.slice(0, 200)}`.toLowerCase();
  if (BLOCKED_WORDS.some((w) => lower.includes(w.toLowerCase()))) return false;
  return true;
}

/** 校验卡牌记录（存档导入时使用），返回问题描述或 null */
export function validateCardRecord(c: unknown): string | null {
  if (!c || typeof c !== 'object') return '不是对象';
  const card = c as Partial<WikiCard>;
  if (typeof card.id !== 'string' || !card.id) return '缺少 id';
  if (typeof card.pageId !== 'number' || card.pageId <= 0) return '缺少有效的 pageId';
  if (typeof card.title !== 'string' || !card.title) return '缺少标题';
  if (typeof card.extract !== 'string') return '缺少摘要';
  if (typeof card.wikiUrl !== 'string' || !/^https:\/\//.test(card.wikiUrl)) return 'Wikipedia 链接无效';
  if (typeof card.wikiLanguage !== 'string' || !card.wikiLanguage) return '缺少语言代码';
  if (!isRarity(card.rarity)) return '稀有度无效';
  if (typeof card.createdAt !== 'number') return '缺少创建时间';
  if (card.imageUrl !== undefined && typeof card.imageUrl !== 'string') return '图片地址无效';
  return null;
}
