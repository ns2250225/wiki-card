import type { WikiSummary } from '@/types';
import { cached, TTL } from '@/utils/cache';
import { encodeTitle, type RequestBudget, variantHeaders, wikiFetch, wikiHost } from './client';

/**
 * REST Summary API
 * GET https://zh.wikipedia.org/api/rest_v1/page/summary/黑洞
 */
export async function getArticleSummary(
  title: string,
  language = 'zh',
  budget?: RequestBudget,
): Promise<WikiSummary> {
  const url = `${wikiHost(language)}/api/rest_v1/page/summary/${encodeTitle(title)}?redirect=true`;
  return cached(`summary:${language}:${title}`, TTL.SUMMARY, async () => {
    const { data } = await wikiFetch<WikiSummary>(url, {
      budget,
      retries: 2,
      headers: variantHeaders(language),
    });
    return data;
  });
}
