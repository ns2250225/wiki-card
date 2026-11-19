import type { Rarity, WikiCard } from '@/types';
import { isRarity } from '@/config/rarity';
import { getTitlesByPageIds } from '@/services/wikipedia/page';
import { getArticleSummary } from '@/services/wikipedia/summary';
import { summaryToCard } from '@/services/card/cardGenerator';
import { db } from '@/database/db';

const RARITY_CODE: Record<Rarity, string> = { common: 'c', rare: 'r', epic: 'e', legendary: 'l', mythic: 'm' };
const CODE_RARITY: Record<string, Rarity> = { c: 'common', r: 'rare', e: 'epic', l: 'legendary', m: 'mythic' };

export const MAX_SHARE_CARDS = 10;

/** 站点根地址（兼容 GitHub Pages 子路径） */
export function siteBaseUrl(): string {
  return `${location.origin}${location.pathname}`;
}

export function siteDisplayUrl(): string {
  return `${location.host}${location.pathname}`.replace(/\/$/, '');
}

/**
 * 生成分享链接（不依赖服务器）：
 *   https://example.com/#/share?cards=zh:12345,en:67890&r=clem&pack=space
 */
export function buildShareUrl(cards: Pick<WikiCard, 'id' | 'rarity'>[], packId?: string): string {
  const params = new URLSearchParams();
  params.set('cards', cards.map((c) => c.id).join(','));
  params.set('r', cards.map((c) => RARITY_CODE[c.rarity] ?? 'c').join(''));
  if (packId) params.set('pack', packId);
  // 保持逗号和冒号可读
  const qs = params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':');
  return `${siteBaseUrl()}#/share?${qs}`;
}

export interface SharedCardRef {
  id: string;
  language: string;
  pageId: number;
  rarity?: Rarity;
}

export interface ParsedShare {
  refs: SharedCardRef[];
  packId?: string;
}

export function parseShareQuery(query: Record<string, unknown>): ParsedShare {
  const raw = String(query.cards ?? '');
  const rarityCodes = String(query.r ?? '');
  const refs: SharedCardRef[] = [];
  const seen = new Set<string>();
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((token, i) => {
      const m = /^([a-z][a-z0-9-]{1,15}):(\d+)$/.exec(token);
      if (!m || seen.has(token) || refs.length >= MAX_SHARE_CARDS) return;
      seen.add(token);
      const rarity = CODE_RARITY[rarityCodes[i]];
      refs.push({ id: token, language: m[1], pageId: Number(m[2]), rarity: isRarity(rarity) ? rarity : undefined });
    });
  const pack = typeof query.pack === 'string' ? query.pack : undefined;
  return { refs, packId: pack };
}

export interface RestoredCard {
  ref: SharedCardRef;
  card?: WikiCard;
  error?: string;
  fromCache?: boolean;
}

/**
 * 分享页恢复：解析 ID → 访问对应语言 Wikipedia → 获取摘要 → 动态生成卡牌。
 * 不依赖分享者的本地存档；API 失败时若本地已缓存该卡牌则降级展示。
 */
export async function restoreSharedCards(refs: SharedCardRef[]): Promise<RestoredCard[]> {
  const byLang = new Map<string, SharedCardRef[]>();
  for (const r of refs) {
    const list = byLang.get(r.language) ?? [];
    list.push(r);
    byLang.set(r.language, list);
  }
  const titleMaps = new Map<string, Map<number, string>>();
  await Promise.all(
    [...byLang.entries()].map(async ([lang, list]) => {
      try {
        titleMaps.set(lang, await getTitlesByPageIds(list.map((r) => r.pageId), lang));
      } catch {
        titleMaps.set(lang, new Map());
      }
    }),
  );

  return Promise.all(
    refs.map(async (ref): Promise<RestoredCard> => {
      const local = await db.cards.get(ref.id).catch(() => undefined);
      const title = titleMaps.get(ref.language)?.get(ref.pageId) ?? local?.title;
      if (!title) {
        if (local) return { ref, card: { ...local, rarity: ref.rarity ?? local.rarity }, fromCache: true };
        return { ref, error: '无法找到该文章' };
      }
      try {
        const summary = await getArticleSummary(title, ref.language);
        const card = summaryToCard(summary, ref.language, local ? { id: local.packId ?? '', category: local.category } : null);
        card.id = ref.id;
        card.pageId = ref.pageId;
        card.rarity = ref.rarity ?? local?.rarity ?? 'common';
        if (local?.englishTitle) card.englishTitle = local.englishTitle;
        return { ref, card };
      } catch (e) {
        if (local) return { ref, card: { ...local, rarity: ref.rarity ?? local.rarity }, fromCache: true };
        return { ref, error: (e as Error).message || '加载失败' };
      }
    }),
  );
}

export function wikiUrlForRef(ref: SharedCardRef): string {
  return `https://${ref.language}.wikipedia.org/w/index.php?curid=${ref.pageId}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
