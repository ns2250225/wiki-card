import type { WikiLanguageLink, WikiPageDetail } from '@/types';
import { cached, getCache, setCache, TTL } from '@/utils/cache';
import {
  actionApiUrl,
  encodeTitle,
  type RequestBudget,
  variantHeaders,
  wikiFetch,
  wikiHost,
} from './client';

/**
 * REST Page API（文章详情：ID、最新修订、许可信息）
 * GET https://zh.wikipedia.org/w/rest.php/v1/page/黑洞/bare
 */
export async function getArticleDetail(title: string, language = 'zh'): Promise<WikiPageDetail> {
  const url = `${wikiHost(language)}/w/rest.php/v1/page/${encodeTitle(title)}/bare`;
  return cached(`detail:${language}:${title}`, TTL.DETAIL, async () => {
    const { data } = await wikiFetch<WikiPageDetail>(url, { headers: variantHeaders(language) });
    return data;
  });
}

/**
 * REST HTML API（完整文章 HTML，仅在需要补充知识详情时请求）
 * GET https://zh.wikipedia.org/api/rest_v1/page/html/黑洞
 */
export async function getArticleHtml(title: string, language = 'zh'): Promise<string> {
  const url = `${wikiHost(language)}/api/rest_v1/page/html/${encodeTitle(title)}?redirect=true`;
  return cached(`html:${language}:${title}`, TTL.DETAIL, async () => {
    const { data } = await wikiFetch<string>(url, { text: true, headers: variantHeaders(language) });
    // 只缓存正文前段，避免 IndexedDB 过大
    return data.length > 400_000 ? data.slice(0, 400_000) : data;
  });
}

/**
 * REST Language API（其他语言版本）
 * GET https://zh.wikipedia.org/w/rest.php/v1/page/黑洞/links/language
 */
export async function getLanguageLinks(title: string, language = 'zh'): Promise<WikiLanguageLink[]> {
  const url = `${wikiHost(language)}/w/rest.php/v1/page/${encodeTitle(title)}/links/language`;
  return cached(`langlinks:${language}:${title}`, TTL.DETAIL, async () => {
    const { data } = await wikiFetch<WikiLanguageLink[]>(url);
    return Array.isArray(data) ? data : [];
  });
}

interface ActionPagesResponse {
  query?: {
    pages?: { pageid?: number; title: string; missing?: boolean; ns?: number }[];
  };
}

/**
 * 根据 Page ID 批量获取标题（用于分享链接恢复）。标题及 ID 长期缓存。
 */
export async function getTitlesByPageIds(
  pageIds: number[],
  language = 'zh',
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  const unique = [...new Set(pageIds)].filter((n) => Number.isFinite(n) && n > 0);
  const missing: number[] = [];
  await Promise.all(
    unique.map(async (id) => {
      const t = await getCache<string>(`title:${language}:${id}`);
      if (t) result.set(id, t);
      else missing.push(id);
    }),
  );
  for (let i = 0; i < missing.length; i += 50) {
    const chunk = missing.slice(i, i + 50);
    const url = actionApiUrl(language, { action: 'query', pageids: chunk.join('|') });
    const { data } = await wikiFetch<ActionPagesResponse>(url);
    for (const p of data.query?.pages ?? []) {
      if (p.pageid && !p.missing) {
        result.set(p.pageid, p.title);
        await setCache(`title:${language}:${p.pageid}`, p.title, TTL.LONG);
      }
    }
  }
  return result;
}

interface LangLinksResponse {
  query?: {
    pages?: { title: string; langlinks?: { lang: string; title: string }[] }[];
  };
}

/**
 * 批量获取英文标题（一次请求，用于卡牌副标题）。失败不影响卡牌生成。
 */
export async function getEnglishTitles(
  titles: string[],
  language = 'zh',
  budget?: RequestBudget,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (language === 'en' || titles.length === 0) return out;
  try {
    const url = actionApiUrl(language, {
      action: 'query',
      prop: 'langlinks',
      lllang: 'en',
      lllimit: 'max',
      redirects: 1,
      titles: titles.join('|'),
    });
    const { data } = await wikiFetch<LangLinksResponse>(url, { budget, retries: 1 });
    for (const p of data.query?.pages ?? []) {
      const en = p.langlinks?.[0]?.title;
      if (en) out.set(p.title, en);
    }
  } catch {
    /* 非核心功能 */
  }
  return out;
}

interface ExtractsResponse {
  query?: { pages?: { title: string; extract?: string }[] };
}

/** Action API 纯文本简介（作为 HTML 无法获取时的补充） */
export async function getPlainIntro(title: string, language = 'zh'): Promise<string> {
  return cached(`intro:${language}:${title}`, TTL.DETAIL, async () => {
    const url = actionApiUrl(language, {
      action: 'query',
      prop: 'extracts',
      explaintext: 1,
      exsectionformat: 'plain',
      exchars: 3000,
      titles: title,
    });
    const { data } = await wikiFetch<ExtractsResponse>(url);
    return data.query?.pages?.[0]?.extract ?? '';
  });
}
