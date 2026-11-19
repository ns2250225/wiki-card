import type { WikiSearchResult } from '@/types';
import { actionApiUrl, type RequestBudget, wikiFetch } from './client';

interface RandomResponse {
  query?: { random?: { id: number; ns: number; title: string }[] };
}

/**
 * Action API 随机文章（不缓存，每次都是新的探索）
 * GET https://zh.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*
 */
export async function getRandomArticles(
  count = 10,
  language = 'zh',
  budget?: RequestBudget,
): Promise<WikiSearchResult[]> {
  const url =
    actionApiUrl(language, {
      action: 'query',
      list: 'random',
      rnnamespace: 0,
      rnlimit: Math.max(1, Math.min(20, count)),
    }) + `&_=${Date.now()}`;
  const { data } = await wikiFetch<RandomResponse>(url, { budget });
  return (data.query?.random ?? [])
    .filter((r) => r.ns === 0)
    .map((r) => ({ id: r.id, key: r.title.replace(/ /g, '_'), title: r.title, language }));
}
