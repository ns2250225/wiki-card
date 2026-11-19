import type { CardPack, WikiCard, WikiSearchResult, WikiSummary } from '@/types';
import { CARDS_PER_PACK } from '@/config/rarity';
import { getPackConfig, getPackQueries } from '@/config/packs';
import { shuffle } from '@/utils/random';
import { commonsFilePageUrl, toHttps } from '@/utils/image';
import { getArticleSummary } from '@/services/wikipedia/summary';
import { searchArticles } from '@/services/wikipedia/search';
import { getRandomArticles } from '@/services/wikipedia/random';
import { getEnglishTitles } from '@/services/wikipedia/page';
import { getPageImages, searchCommonsImage } from '@/services/wikipedia/commons';
import { BudgetExceededError, RequestBudget, WikiApiError } from '@/services/wikipedia/client';
import { isAcceptableTitle, isValidSummary } from './cardValidator';
import { extractFunFact, inferCategory } from './factExtractor';

export class InsufficientCardsError extends Error {
  constructor(public found: number) {
    super(`只找到 ${found} 篇合适的文章，不足 ${CARDS_PER_PACK} 张，请稍后重试或换一个卡包`);
    this.name = 'InsufficientCardsError';
  }
}

export class ConsecutiveFailureError extends Error {
  constructor() {
    super('连续请求失败，已终止开包，本次不消耗免费次数');
    this.name = 'ConsecutiveFailureError';
  }
}

export interface GenerateProgress {
  stage: 'search' | 'summary' | 'image' | 'build';
  message: string;
  found: number;
  total: number;
}

export interface GenerateOptions {
  language?: string;
  budget?: RequestBudget;
  /** 已收藏卡牌 ID，用于优先探索新知识 */
  ownedIds?: Set<string>;
  onProgress?: (p: GenerateProgress) => void;
}

export interface CardGenerator {
  generatePack(packId: string, count: number, opts?: GenerateOptions): Promise<WikiCard[]>;
}

export const SOURCE_LICENSE = 'CC BY-SA 4.0';

function stripTags(s?: string): string {
  return (s ?? '').replace(/<[^>]+>/g, '').trim();
}

function shortDescription(summary: WikiSummary, fallback?: string | null): string {
  if (summary.description) return summary.description;
  if (fallback) return fallback;
  const first = summary.extract.split(/(?<=[。！？.!?])/)[0] ?? '';
  return first.length > 40 ? `${first.slice(0, 38)}…` : first;
}

/** 将 Wikipedia 摘要转换为卡牌数据（稀有度稍后由抽卡系统分配） */
export function summaryToCard(
  summary: WikiSummary,
  language: string,
  pack: Pick<CardPack, 'id' | 'category' | 'random'> | null,
  candidate?: Partial<WikiSearchResult>,
): WikiCard {
  const pageId = summary.pageid ?? candidate?.id ?? 0;
  const title = stripTags(summary.displaytitle) || summary.title;
  const description = shortDescription(summary, candidate?.description);
  const original = toHttps(summary.originalimage?.source);
  const thumb = toHttps(summary.thumbnail?.source) ?? candidate?.thumbnailUrl;
  const category =
    !pack || pack.random ? inferCategory(`${description} ${summary.extract.slice(0, 120)}`) : pack.category;
  return {
    id: `${language}:${pageId}`,
    pageId,
    title,
    description,
    extract: summary.extract.trim(),
    funFact: extractFunFact(summary.extract),
    category,
    packId: pack?.id,
    rarity: 'common',
    imageUrl: thumb ?? original,
    originalImageUrl: original ?? thumb,
    imageSourceUrl: commonsFilePageUrl(original ?? thumb),
    wikiUrl: summary.content_urls.desktop.page,
    wikiLanguage: language,
    wikibaseItem: summary.wikibase_item,
    revisionId: summary.revision ? Number(summary.revision) || undefined : undefined,
    sourceLicense: SOURCE_LICENSE,
    createdAt: Date.now(),
  };
}

const MAX_ROUNDS = 6;
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * 动态生成卡包：
 * 1. 获取卡包搜索关键词  2. 执行搜索  3. 获取候选文章  4. 随机排序
 * 5. 检查本包重复  6. 获取摘要  7. 过滤无效页面  8.（稀有度由 packOpening 分配）
 * 9. 生成卡牌  10. 返回 5 张卡牌
 */
export async function generatePack(
  packId: string,
  count = CARDS_PER_PACK,
  opts: GenerateOptions = {},
): Promise<WikiCard[]> {
  const pack = getPackConfig(packId);
  if (!pack) throw new Error(`卡包不存在：${packId}`);
  const language = opts.language ?? pack.language;
  const budget = opts.budget ?? new RequestBudget(45);
  const owned = opts.ownedIds ?? new Set<string>();
  const report = (stage: GenerateProgress['stage'], message: string, found: number) =>
    opts.onProgress?.({ stage, message, found, total: count });

  const queries = shuffle(getPackQueries(pack, language));
  const triedIds = new Set<number>();
  const selected: WikiCard[] = [];
  const selectedIds = new Set<string>();
  let failures = 0;
  let round = 0;
  let queryIndex = 0;

  while (selected.length < count && round < MAX_ROUNDS) {
    round++;
    // ---- 获取候选文章 ----
    let candidates: WikiSearchResult[] = [];
    try {
      if (pack.random) {
        report('search', '正在随机探索 Wikipedia...', selected.length);
        candidates = await getRandomArticles(20, language, budget);
      } else {
        if (queryIndex >= queries.length) break; // 关键词已用尽，避免无限搜索
        const q = queries[queryIndex++];
        report('search', `正在搜索「${q}」相关的百科条目...`, selected.length);
        candidates = await searchArticles(q, 50, language, budget);
      }
      failures = 0;
    } catch (e) {
      if (e instanceof BudgetExceededError) break;
      if (e instanceof WikiApiError && (e.rateLimited || e.network) && selected.length === 0) throw e;
      failures++;
      if (failures >= MAX_CONSECUTIVE_FAILURES) throw new ConsecutiveFailureError();
      continue;
    }

    // ---- 过滤 & 随机打乱，优先未收集的知识 ----
    const fresh = shuffle(
      candidates.filter((c) => !triedIds.has(c.id) && isAcceptableTitle(c.title)),
    );
    const unowned = fresh.filter((c) => !owned.has(`${language}:${c.id}`));
    const ownedOnes = fresh.filter((c) => owned.has(`${language}:${c.id}`));
    // 已拥有的卡牌仍有机会再次出现（允许重复获得）
    const ordered = [...unowned, ...shuffle(ownedOnes).filter(() => Math.random() < 0.5)];
    if (unowned.length < count) ordered.push(...ownedOnes.filter((c) => !ordered.includes(c)));

    // ---- 获取摘要（并发由客户端限制为 3） ----
    let idx = 0;
    while (selected.length < count && idx < ordered.length) {
      const need = count - selected.length;
      const batch = ordered.slice(idx, idx + Math.min(3, need + 1));
      idx += batch.length;
      batch.forEach((c) => triedIds.add(c.id));
      report('summary', '正在收集百科条目...', selected.length);
      const results = await Promise.allSettled(batch.map((c) => getArticleSummary(c.title, language, budget)));
      let budgetHit = false;
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          if (r.reason instanceof BudgetExceededError) budgetHit = true;
          else if ((r.reason as WikiApiError)?.notFound) return; // 文章不存在：跳过
          else if ((r.reason as WikiApiError)?.rateLimited) throw r.reason;
          else failures++;
          return;
        }
        failures = 0;
        const summary = r.value;
        if (!isValidSummary(summary)) return;
        const card = summaryToCard(summary, language, pack, batch[i]);
        if (!card.pageId || selectedIds.has(card.id) || selected.length >= count) return;
        selectedIds.add(card.id);
        selected.push(card);
      });
      if (failures >= MAX_CONSECUTIVE_FAILURES) throw new ConsecutiveFailureError();
      if (budgetHit) break;
    }
    if (budget.remaining <= 0) break;
  }

  if (selected.length < count) throw new InsufficientCardsError(selected.length);

  // ---- 英文副标题（一次请求） ----
  report('build', '正在生成你的知识卡牌...', selected.length);
  const enTitles = await getEnglishTitles(
    selected.map((c) => c.title),
    language,
    budget.remaining > 0 ? budget : undefined,
  );
  selected.forEach((c) => {
    const en = enTitles.get(c.title);
    if (en) c.englishTitle = en;
  });

  // ---- 图片补充：文章主图 → 缩略图 → Commons → 动态主题背景 ----
  const noImage = selected.filter((c) => !c.imageUrl);
  if (noImage.length) {
    report('image', '正在寻找知识插图...', selected.length);
    const images = await getPageImages(
      noImage.map((c) => c.title),
      language,
    );
    let commonsTries = 0;
    for (const c of noImage) {
      const img = images.get(c.title);
      if (img) {
        c.imageUrl = img.thumb ?? img.original;
        c.originalImageUrl = img.original ?? img.thumb;
      } else if (commonsTries < 2) {
        commonsTries++;
        const found = await searchCommonsImage(c.englishTitle ?? c.title);
        if (found) {
          c.imageUrl = found.thumb ?? found.original;
          c.originalImageUrl = found.original ?? found.thumb;
        }
      }
      c.imageSourceUrl = commonsFilePageUrl(c.originalImageUrl ?? c.imageUrl);
    }
  }

  return selected;
}

export const cardGenerator: CardGenerator = { generatePack };
