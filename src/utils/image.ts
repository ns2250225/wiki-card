import { hashString, seededRandom } from './random';
import { CATEGORY_COLORS } from '@/config/packs';

/** 规范化为 HTTPS 地址 */
export function toHttps(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  return url;
}

/**
 * 将 Wikimedia 缩略图 URL 调整为指定宽度。
 * 例：.../thumb/a/ab/File.jpg/320px-File.jpg -> .../960px-File.jpg
 */
export function resizeWikimediaThumb(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!url.includes('/thumb/')) return url;
  return url.replace(/\/(\d+)px-([^/]+)$/, (_m, _w, name) => `/${width}px-${name}`);
}

/** 从 upload.wikimedia.org 地址推断文件名 */
export function fileNameFromImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(toHttps(url)!);
    if (!u.hostname.endsWith('wikimedia.org')) return undefined;
    const parts = u.pathname.split('/');
    const thumbIdx = parts.indexOf('thumb');
    const name = thumbIdx >= 0 ? parts[thumbIdx + 3] : parts[parts.length - 1];
    return name ? decodeURIComponent(name) : undefined;
  } catch {
    return undefined;
  }
}

export function commonsFilePageUrl(url?: string): string | undefined {
  const name = fileNameFromImageUrl(url);
  if (!name) return undefined;
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name.replace(/ /g, '_'))}`;
}

function escapeXml(s: string): string {
  const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
  return s.replace(/[<>&'"]/g, (c) => map[c]);
}

/** 使用 SVG 动态生成主题背景（无图片时的降级方案） */
export function themeBackground(seedText: string, category = ''): string {
  const seed = hashString(seedText + category);
  const rnd = seededRandom(seed);
  const accent = CATEGORY_COLORS[category] ?? `hsl(${Math.floor(rnd() * 360)} 70% 60%)`;
  const hue2 = Math.floor(rnd() * 360);
  const shapes: string[] = [];
  const count = 10 + Math.floor(rnd() * 8);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rnd() * 400);
    const y = Math.floor(rnd() * 300);
    const r = 6 + Math.floor(rnd() * 46);
    const o = (0.08 + rnd() * 0.25).toFixed(2);
    const kind = rnd();
    if (kind < 0.4) {
      shapes.push(
        `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${accent}" stroke-opacity="${o}" stroke-width="2"/>`,
      );
    } else if (kind < 0.7) {
      const s = r * 1.4;
      shapes.push(
        `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${accent}" fill-opacity="${o}" transform="rotate(${Math.floor(rnd() * 90)} ${x} ${y})"/>`,
      );
    } else {
      const x2 = x + r * 2;
      shapes.push(
        `<polygon points="${x},${y} ${x2},${y} ${(x + x2) / 2},${y - r * 1.5}" fill="hsl(${hue2} 70% 60%)" fill-opacity="${o}"/>`,
      );
    }
  }
  const stars: string[] = [];
  for (let i = 0; i < 30; i++) {
    stars.push(
      `<circle cx="${Math.floor(rnd() * 400)}" cy="${Math.floor(rnd() * 300)}" r="${(rnd() * 1.6 + 0.3).toFixed(1)}" fill="#fff" fill-opacity="${(rnd() * 0.7 + 0.2).toFixed(2)}"/>`,
    );
  }
  const letter = escapeXml((seedText || 'W').slice(0, 1).toUpperCase());
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">` +
    `<defs><radialGradient id="g" cx="${(rnd() * 100).toFixed(0)}%" cy="${(rnd() * 100).toFixed(0)}%" r="90%">` +
    `<stop offset="0" stop-color="${accent}" stop-opacity="0.55"/><stop offset="0.55" stop-color="hsl(${hue2} 45% 22%)"/>` +
    `<stop offset="1" stop-color="#11131B"/></radialGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>${stars.join('')}${shapes.join('')}` +
    `<text x="200" y="172" text-anchor="middle" font-family="Georgia,serif" font-size="72" font-weight="700" fill="#fff" fill-opacity="0.14">${letter}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 以 CORS 模式加载图片（用于 Canvas 绘制） */
export function loadImage(src: string, timeout = 12000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('image timeout')), timeout);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`image load failed: ${src}`));
    };
    img.src = src;
  });
}

/** 依次尝试多个候选地址 */
export async function loadFirstImage(sources: (string | undefined)[]): Promise<HTMLImageElement | null> {
  for (const src of sources) {
    if (!src) continue;
    try {
      return await loadImage(src);
    } catch {
      /* try next */
    }
  }
  return null;
}
