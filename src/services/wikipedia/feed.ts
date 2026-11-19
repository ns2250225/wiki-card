import type { TrendingArticle } from '@/types';
import { cached, TTL } from '@/utils/cache';
import { toHttps } from '@/utils/image';
import { actionApiUrl, variantHeaders, wikiFetch, wikiHost } from './client';

interface FeedResponse {
  mostread?: {
    articles?: {
      pageid: number;
      title: string;
      normalizedtitle?: string;
      description?: string;
      extract?: string;
      views?: number;
      thumbnail?: { source: string };
      content_urls?: { desktop?: { page: string } };
      namespace?: { id: number };
    }[];
  };
}

interface MostViewedResponse {
  query?: { mostviewed?: { ns: number; title: string; count: number }[] };
}

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 热门知识推荐：通过 Wikipedia Feed API 获取昨日热门文章（不使用预置卡牌）。
 * 失败时退回 Action API mostviewed。
 */
export async function getTrendingArticles(language = 'zh', limit = 8): Promise<TrendingArticle[]> {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  const date = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
  return cached(`trending:${language}:${date}`, TTL.SEARCH, async () => {
    try {
      const url = `${wikiHost(language)}/api/rest_v1/feed/featured/${date}`;
      const { data } = await wikiFetch<FeedResponse>(url, { retries: 1, headers: variantHeaders(language) });
      const list = (data.mostread?.articles ?? [])
        .filter((a) => (a.namespace?.id ?? 0) === 0 && !/[:：]/.test(a.title))
        .slice(0, limit)
        .map<TrendingArticle>((a) => ({
          pageId: a.pageid,
          title: a.normalizedtitle ?? a.title.replace(/_/g, ' '),
          description: a.description,
          extract: a.extract,
          thumbnailUrl: toHttps(a.thumbnail?.source),
          wikiUrl: a.content_urls?.desktop?.page ?? `${wikiHost(language)}/wiki/${encodeURIComponent(a.title)}`,
          views: a.views,
          language,
        }));
      if (list.length) return list;
    } catch {
      /* fallback below */
    }
    const url = actionApiUrl(language, { action: 'query', list: 'mostviewed', pvimlimit: 30 });
    const { data } = await wikiFetch<MostViewedResponse>(url, { retries: 1 });
    return (data.query?.mostviewed ?? [])
      .filter((a) => a.ns === 0 && !/首页|Main Page/i.test(a.title))
      .slice(0, limit)
      .map<TrendingArticle>((a) => ({
        pageId: 0,
        title: a.title,
        wikiUrl: `${wikiHost(language)}/wiki/${encodeURIComponent(a.title.replace(/ /g, '_'))}`,
        views: a.count,
        language,
      }));
  });
}
