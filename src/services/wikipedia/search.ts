import type { WikiSearchResult } from '@/types';
import { cached, TTL } from '@/utils/cache';
import { toHttps } from '@/utils/image';
import { type RequestBudget, variantHeaders, wikiFetch, wikiHost } from './client';

interface RestSearchResponse {
  pages: {
    id: number;
    key: string;
    title: string;
    excerpt?: string;
    description?: string | null;
    thumbnail?: { url?: string } | null;
  }[];
}

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  return s.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}

/**
 * REST Search API
 * GET https://zh.wikipedia.org/w/rest.php/v1/search/page?q=黑洞&limit=20
 */
export async function searchArticles(
  query: string,
  limit = 30,
  language = 'zh',
  budget?: RequestBudget,
): Promise<WikiSearchResult[]> {
  const lim = Math.max(1, Math.min(100, limit));
  const url = `${wikiHost(language)}/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=${lim}`;
  return cached(`search:${language}:${query}:${lim}`, TTL.SEARCH, async () => {
    const { data } = await wikiFetch<RestSearchResponse>(url, { budget, headers: variantHeaders(language) });
    return (data.pages ?? []).map((p) => ({
      id: p.id,
      key: p.key,
      title: p.title,
      excerpt: stripHtml(p.excerpt),
      description: p.description ?? undefined,
      thumbnailUrl: toHttps(p.thumbnail?.url),
      language,
    }));
  });
}
