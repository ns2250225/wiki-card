import type { ImageLicenseInfo } from '@/types';
import { cached, TTL } from '@/utils/cache';
import { fileNameFromImageUrl, toHttps } from '@/utils/image';
import { actionApiUrl, commonsApiUrl, type RequestBudget, wikiFetch } from './client';

interface PageImagesResponse {
  query?: {
    pages?: {
      title: string;
      original?: { source: string; width: number; height: number };
      thumbnail?: { source: string; width: number; height: number };
    }[];
    redirects?: { from: string; to: string }[];
  };
}

export interface ResolvedImage {
  thumb?: string;
  original?: string;
}

/**
 * 通过 Action API pageimages 批量获取文章图片（Summary 无图时的补充）
 */
export async function getPageImages(
  titles: string[],
  language = 'zh',
  budget?: RequestBudget,
): Promise<Map<string, ResolvedImage>> {
  const out = new Map<string, ResolvedImage>();
  if (!titles.length) return out;
  try {
    const url = actionApiUrl(language, {
      action: 'query',
      prop: 'pageimages',
      piprop: 'original|thumbnail',
      pithumbsize: 500,
      pilicense: 'any',
      redirects: 1,
      titles: titles.join('|'),
    });
    const { data } = await wikiFetch<PageImagesResponse>(url, { budget, retries: 1 });
    const back = new Map<string, string>();
    for (const r of data.query?.redirects ?? []) back.set(r.to, r.from);
    for (const p of data.query?.pages ?? []) {
      if (p.thumbnail || p.original) {
        const img = { thumb: toHttps(p.thumbnail?.source), original: toHttps(p.original?.source) };
        out.set(p.title, img);
        const from = back.get(p.title);
        if (from) out.set(from, img);
      }
    }
  } catch {
    /* 非核心 */
  }
  return out;
}

interface CommonsSearchResponse {
  query?: {
    pages?: {
      title: string;
      imageinfo?: { thumburl?: string; url?: string; mime?: string }[];
    }[];
  };
}

/**
 * 在 Wikimedia Commons 中搜索相关图片（第三优先级）
 */
export async function searchCommonsImage(
  query: string,
  budget?: RequestBudget,
): Promise<ResolvedImage | undefined> {
  try {
    return await cached(`commons:${query}`, TTL.SUMMARY, async () => {
      const url = commonsApiUrl({
        action: 'query',
        generator: 'search',
        gsrsearch: `${query} filetype:bitmap`,
        gsrnamespace: 6,
        gsrlimit: 3,
        prop: 'imageinfo',
        iiprop: 'url|mime',
        iiurlwidth: 500,
      });
      const { data } = await wikiFetch<CommonsSearchResponse>(url, { budget, retries: 1 });
      const page = (data.query?.pages ?? []).find((p) =>
        p.imageinfo?.[0]?.mime?.startsWith('image/'),
      );
      const info = page?.imageinfo?.[0];
      if (!info) return { thumb: undefined, original: undefined };
      return { thumb: toHttps(info.thumburl), original: toHttps(info.url) };
    }).then((r) => (r.thumb || r.original ? r : undefined));
  } catch {
    return undefined;
  }
}

interface ImageInfoResponse {
  query?: {
    pages?: {
      title: string;
      imageinfo?: {
        descriptionurl?: string;
        extmetadata?: Record<string, { value: string } | undefined>;
      }[];
    }[];
  };
}

function plain(html?: string): string | undefined {
  if (!html) return undefined;
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent?.trim() || undefined;
}

/**
 * 获取图片的来源与许可信息（卡牌详情页按需请求）
 */
export async function getImageLicense(imageUrl: string, language = 'zh'): Promise<ImageLicenseInfo | undefined> {
  const name = fileNameFromImageUrl(imageUrl);
  if (!name) return undefined;
  const isCommons = /\/wikipedia\/commons\//.test(imageUrl);
  return cached(`imglicense:${name}`, TTL.SUMMARY, async () => {
    const params = {
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      titles: `File:${name}`,
    };
    const url = isCommons ? commonsApiUrl(params) : actionApiUrl(language, params);
    const { data } = await wikiFetch<ImageInfoResponse>(url, { retries: 1 });
    const info = data.query?.pages?.[0]?.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    return {
      fileTitle: name,
      descriptionUrl: info?.descriptionurl,
      license: plain(meta.LicenseShortName?.value) ?? plain(meta.UsageTerms?.value),
      licenseUrl: plain(meta.LicenseUrl?.value),
      artist: plain(meta.Artist?.value),
      credit: plain(meta.Credit?.value),
    };
  });
}
