import type { WikiPageDetail, WikiSearchResult, WikiSummary } from '@/types';
import { searchArticles } from './search';
import { getArticleSummary } from './summary';
import { getArticleDetail, getArticleHtml, getLanguageLinks, getTitlesByPageIds } from './page';
import { getRandomArticles } from './random';
import { getImageLicense, getPageImages, searchCommonsImage } from './commons';
import { getTrendingArticles } from './feed';
import { actionApiUrl, commonsApiUrl, describeError, encodeTitle, wikiFetch, wikiHost } from './client';

export interface WikipediaService {
  searchArticles(query: string, limit?: number, language?: string): Promise<WikiSearchResult[]>;
  getArticleSummary(title: string, language?: string): Promise<WikiSummary>;
  getArticleDetail(title: string, language?: string): Promise<WikiPageDetail>;
  getRandomArticles(count: number, language?: string): Promise<WikiSearchResult[]>;
}

export const wikipediaService: WikipediaService = {
  searchArticles: (q, limit, lang) => searchArticles(q, limit, lang),
  getArticleSummary: (t, lang) => getArticleSummary(t, lang),
  getArticleDetail: (t, lang) => getArticleDetail(t, lang),
  getRandomArticles: (n, lang) => getRandomArticles(n, lang),
};

export {
  searchArticles,
  getArticleSummary,
  getArticleDetail,
  getArticleHtml,
  getLanguageLinks,
  getTitlesByPageIds,
  getRandomArticles,
  getImageLicense,
  getPageImages,
  searchCommonsImage,
  getTrendingArticles,
};

export interface ConnectivityResult {
  name: string;
  api: string;
  ok: boolean;
  ms: number;
  message: string;
}

/**
 * API 跨域连通性检测：在真实浏览器中逐一验证 REST API / Action API 的 CORS 可用性。
 * 绕过缓存直接请求。
 */
export async function runConnectivityCheck(language = 'zh'): Promise<ConnectivityResult[]> {
  const sample = language === 'zh' ? '黑洞' : 'Black hole';
  const host = wikiHost(language);
  const ts = Date.now();
  const checks: { name: string; api: string; url: string; text?: boolean }[] = [
    { name: '搜索文章', api: 'REST Search', url: `${host}/w/rest.php/v1/search/page?q=${encodeURIComponent(sample)}&limit=1&_=${ts}` },
    { name: '文章摘要', api: 'REST Summary', url: `${host}/api/rest_v1/page/summary/${encodeTitle(sample)}?_=${ts}` },
    { name: '文章详情', api: 'REST Page', url: `${host}/w/rest.php/v1/page/${encodeTitle(sample)}/bare?_=${ts}` },
    { name: '文章 HTML', api: 'REST HTML', url: `${host}/api/rest_v1/page/html/${encodeTitle(sample)}?_=${ts}`, text: true },
    { name: '多语言版本', api: 'REST Language', url: `${host}/w/rest.php/v1/page/${encodeTitle(sample)}/links/language?_=${ts}` },
    { name: '随机文章', api: 'Action API', url: actionApiUrl(language, { action: 'query', list: 'random', rnnamespace: 0, rnlimit: 1 }) + `&_=${ts}` },
    { name: 'Commons 图片', api: 'Commons API', url: commonsApiUrl({ action: 'query', list: 'search', srsearch: 'galaxy', srnamespace: 6, srlimit: 1 }) + `&_=${ts}` },
  ];
  const results: ConnectivityResult[] = [];
  for (const c of checks) {
    const start = performance.now();
    try {
      await wikiFetch(c.url, { text: c.text, retries: 0, timeout: 10000 });
      results.push({ name: c.name, api: c.api, ok: true, ms: Math.round(performance.now() - start), message: '可用' });
    } catch (e) {
      results.push({ name: c.name, api: c.api, ok: false, ms: Math.round(performance.now() - start), message: describeError(e) });
    }
  }
  return results;
}
