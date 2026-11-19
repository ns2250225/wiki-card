import QRCode from 'qrcode';
import type { Rarity, WikiCard } from '@/types';
import { RARITY_MAP } from '@/config/rarity';
import { loadFirstImage, loadImage, resizeWikimediaThumb, themeBackground } from '@/utils/image';
import { siteDisplayUrl } from './shareUrl';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",system-ui,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';
const RAINBOW = ['#FF5DB7', '#FFC247', '#5CFFB0', '#398BFF', '#A45CFF', '#FF5DB7'];

function font(size: number, weight = 400, family = FONT) {
  return `${weight} ${size}px ${family}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rarityStroke(ctx: CanvasRenderingContext2D, rarity: Rarity, x: number, y: number, w: number, h: number) {
  if (rarity === 'mythic') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
    return g;
  }
  if (rarity === 'epic') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#A45CFF');
    g.addColorStop(1, '#6B3DFF');
    return g;
  }
  if (rarity === 'legendary') {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#FFE29A');
    g.addColorStop(0.5, '#FFC247');
    g.addColorStop(1, '#C88A12');
    return g;
  }
  return RARITY_MAP[rarity].color;
}

/** 按宽度换行（中文逐字、英文按单词） */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const tokens = text.replace(/\s+/g, ' ').match(/[⺀-鿿＀-￯]|[^\s⺀-鿿＀-￯]+\s*|\s+/g) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const tok of tokens) {
    const test = line + tok;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trimEnd());
      line = tok.trimStart();
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line.trimEnd());
  if (lines.length > maxLines) lines.length = maxLines;
  const consumed = lines.join('').replace(/\s/g, '').length;
  if (consumed < text.replace(/\s/g, '').length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const iw = img.width || w;
  const ih = img.height || h;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

async function loadCardImage(card: WikiCard, width: number): Promise<HTMLImageElement> {
  const upgraded = resizeWikimediaThumb(card.imageUrl, width >= 500 ? 960 : 500);
  const img = await loadFirstImage([upgraded, card.imageUrl, card.originalImageUrl]);
  if (img) return img;
  return loadImage(themeBackground(card.title, card.category));
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, n: number) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = Math.random() * 0.6 + 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string) {
  ctx.fillStyle = '#11131B';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, h * 0.8);
  g.addColorStop(0, `${accent}55`);
  g.addColorStop(0.5, '#1C203088');
  g.addColorStop(1, '#11131B00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h, 160);
}

function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign = 'center') {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const text = 'WIKICARD';
  ctx.font = font(size, 800, SERIF);
  const w = ctx.measureText(text).width;
  const start = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const g = ctx.createLinearGradient(start, y, start + w, y);
  g.addColorStop(0, '#398BFF');
  g.addColorStop(0.5, '#A45CFF');
  g.addColorStop(1, '#FF5DB7');
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
}

/** 在 Canvas 上绘制一张卡牌正面（与页面卡牌样式一致） */
export async function drawCard(ctx: CanvasRenderingContext2D, card: WikiCard, x: number, y: number, w: number) {
  const h = (w * 4) / 3;
  const r = w * 0.05;
  const rarity = RARITY_MAP[card.rarity];
  const border = Math.max(4, w * 0.024);

  // 光晕
  ctx.save();
  ctx.shadowColor = card.rarity === 'common' ? 'rgba(0,0,0,0.5)' : `${rarity.color}aa`;
  ctx.shadowBlur = w * 0.12;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = rarityStroke(ctx, card.rarity, x, y, w, h);
  ctx.fill();
  ctx.restore();

  // 内部面板
  const ix = x + border;
  const iy = y + border;
  const iw = w - border * 2;
  const ih = h - border * 2;
  ctx.save();
  roundRect(ctx, ix, iy, iw, ih, Math.max(2, r - border));
  ctx.fillStyle = '#161927';
  ctx.fill();
  ctx.clip();

  // 图片
  const imgH = ih * 0.47;
  const img = await loadCardImage(card, w);
  drawCover(ctx, img, ix, iy, iw, imgH);
  const fade = ctx.createLinearGradient(0, iy + imgH * 0.55, 0, iy + imgH);
  fade.addColorStop(0, 'rgba(22,25,39,0)');
  fade.addColorStop(1, 'rgba(22,25,39,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(ix, iy, iw, imgH);

  if (card.rarity === 'mythic') {
    const holo = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    RAINBOW.forEach((c, i) => holo.addColorStop(i / (RAINBOW.length - 1), `${c}33`));
    ctx.fillStyle = holo;
    ctx.fillRect(ix, iy, iw, ih);
  }

  // 稀有度标签
  const labelSize = w * 0.04;
  ctx.font = font(labelSize, 800);
  const label = rarity.label;
  const lw = ctx.measureText(label).width + labelSize * 1.6;
  ctx.fillStyle = 'rgba(10,12,20,0.7)';
  roundRect(ctx, ix + iw / 2 - lw / 2, iy + w * 0.03, lw, labelSize * 1.8, labelSize * 0.9);
  ctx.fill();
  ctx.fillStyle = card.rarity === 'mythic' ? '#FFD6EE' : rarity.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, ix + iw / 2, iy + w * 0.03 + labelSize * 0.92);

  // 标题
  let cy = iy + imgH + w * 0.02;
  ctx.fillStyle = '#F5F5F7';
  ctx.font = font(w * 0.075, 800);
  const titleLines = wrapText(ctx, card.title, iw * 0.88, 2);
  titleLines.forEach((t) => {
    cy += w * 0.08;
    ctx.fillText(t, ix + iw / 2, cy);
  });
  if (card.englishTitle && card.englishTitle !== card.title) {
    cy += w * 0.055;
    ctx.font = font(w * 0.036, 600);
    ctx.fillStyle = '#8b90a3';
    ctx.fillText(wrapText(ctx, card.englishTitle.toUpperCase(), iw * 0.85, 1)[0] ?? '', ix + iw / 2, cy);
  }

  // 分类
  cy += w * 0.07;
  ctx.font = font(w * 0.034, 700);
  const cw = ctx.measureText(card.category).width + w * 0.06;
  ctx.fillStyle = `${rarity.color}33`;
  roundRect(ctx, ix + iw / 2 - cw / 2, cy - w * 0.03, cw, w * 0.06, w * 0.03);
  ctx.fill();
  ctx.fillStyle = card.rarity === 'common' ? '#d6d8de' : rarity.color;
  ctx.fillText(card.category, ix + iw / 2, cy);

  // 描述
  cy += w * 0.06;
  ctx.font = font(w * 0.038, 400);
  ctx.fillStyle = '#c9ccd6';
  const descLines = wrapText(ctx, card.description || card.extract, iw * 0.84, card.englishTitle ? 3 : 4);
  descLines.forEach((t) => {
    cy += w * 0.055;
    ctx.fillText(t, ix + iw / 2, cy);
  });

  // 底部
  ctx.font = font(w * 0.03, 800, SERIF);
  ctx.fillStyle = '#6d7287';
  ctx.fillText('WIKICARD', ix + iw / 2, iy + ih - w * 0.085);
  ctx.font = font(w * 0.028, 500);
  ctx.fillText(`#${card.pageId}`, ix + iw / 2, iy + ih - w * 0.045);
  ctx.restore();
}

async function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number) {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: size * 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#11131B', light: '#FFFFFF' },
    });
    const img = await loadImage(dataUrl);
    ctx.save();
    roundRect(ctx, x - 8, y - 8, size + 16, size + 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } catch {
    /* 二维码失败时只显示网址 */
  }
}

function createCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/** 单卡分享海报 1080 × 1440 */
export async function generateCardPoster(card: WikiCard, shareUrl: string): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1440;
  const { canvas, ctx } = createCanvas(W, H);
  const rarity = RARITY_MAP[card.rarity];
  drawBackground(ctx, W, H, rarity.color);
  drawLogo(ctx, W / 2, 70, 44);

  await drawCard(ctx, card, 300, 120, 480);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#F5F5F7';
  ctx.font = font(60, 800);
  ctx.fillText(wrapText(ctx, card.title, 960, 1)[0] ?? card.title, W / 2, 860);

  ctx.font = font(32, 800);
  ctx.fillStyle = card.rarity === 'mythic' ? '#FF5DB7' : rarity.color;
  ctx.fillText(`${rarity.name} · ${rarity.label}   |   ${card.category}`, W / 2, 915);

  ctx.font = font(32, 400);
  ctx.fillStyle = '#c9ccd6';
  const lines = wrapText(ctx, card.extract, 900, 5);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 980 + i * 48));

  // 底部：来源 + 二维码
  ctx.fillStyle = 'rgba(28,32,48,0.85)';
  roundRect(ctx, 50, 1240, 980, 160, 28);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = font(26, 700);
  ctx.fillStyle = '#F5F5F7';
  ctx.fillText('知识来源：Wikipedia', 90, 1290);
  ctx.font = font(22, 400);
  ctx.fillStyle = '#8b90a3';
  ctx.fillText(wrapText(ctx, safeDecode(card.wikiUrl), 700, 1)[0] ?? '', 90, 1330);
  ctx.fillText(`内容许可 ${card.sourceLicense ?? 'CC BY-SA 4.0'} · ${siteDisplayUrl()}`, 90, 1368);
  await drawQr(ctx, shareUrl, 890, 1256, 128);
  return canvas;
}

export interface PackPosterInfo {
  packName: string;
  accent: string;
  newCount: number;
}

/** 整包分享海报 1080 × 1920 */
export async function generatePackPoster(
  cards: WikiCard[],
  info: PackPosterInfo,
  shareUrl: string,
): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1920;
  const { canvas, ctx } = createCanvas(W, H);
  const best = cards.reduce((b, c) => (RARITY_MAP[c.rarity].rank > RARITY_MAP[b.rarity].rank ? c : b), cards[0]);
  const bestR = RARITY_MAP[best?.rarity ?? 'common'];
  drawBackground(ctx, W, H, info.accent);

  drawLogo(ctx, W / 2, 90, 52);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(30, 500);
  ctx.fillStyle = '#8b90a3';
  ctx.fillText('打开一包，发现一个世界', W / 2, 150);

  ctx.font = font(76, 800);
  ctx.fillStyle = '#F5F5F7';
  ctx.fillText(info.packName, W / 2, 255);

  ctx.font = font(32, 700);
  ctx.fillStyle = bestR.id === 'mythic' ? '#FF5DB7' : bestR.color;
  ctx.fillText(`最高稀有度 ${bestR.name} ${bestR.label}`, W / 2, 315);
  ctx.fillStyle = '#c9ccd6';
  ctx.font = font(28, 500);
  ctx.fillText(`本次新获得 ${info.newCount} 张 · 共 ${cards.length} 张知识卡牌`, W / 2, 362);

  const cw = 300;
  const ch = (cw * 4) / 3;
  const positions: [number, number][] =
    cards.length >= 4
      ? [
          [60, 410],
          [390, 410],
          [720, 410],
          [225, 410 + ch + 40],
          [555, 410 + ch + 40],
        ]
      : cards.map((_, i) => [W / 2 - (cards.length * (cw + 30) - 30) / 2 + i * (cw + 30), 500]);
  for (let i = 0; i < Math.min(cards.length, positions.length); i++) {
    await drawCard(ctx, cards[i], positions[i][0], positions[i][1], cw);
  }

  // 卡牌清单
  let ly = 410 + ch * 2 + 120;
  ctx.textAlign = 'left';
  cards.slice(0, 5).forEach((c) => {
    const r = RARITY_MAP[c.rarity];
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(110, ly - 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = font(30, 700);
    ctx.fillStyle = '#F5F5F7';
    ctx.fillText(wrapText(ctx, c.title, 560, 1)[0] ?? '', 135, ly);
    ctx.font = font(24, 700);
    ctx.fillStyle = r.color;
    ctx.textAlign = 'right';
    ctx.fillText(r.label, 970, ly);
    ctx.textAlign = 'left';
    ly += 52;
  });

  ctx.fillStyle = 'rgba(28,32,48,0.85)';
  roundRect(ctx, 50, 1720, 980, 170, 28);
  ctx.fill();
  ctx.font = font(30, 800);
  ctx.fillStyle = '#F5F5F7';
  ctx.fillText('扫码查看这包知识卡牌', 90, 1785);
  ctx.font = font(22, 400);
  ctx.fillStyle = '#8b90a3';
  ctx.fillText(`知识来源 Wikipedia · CC BY-SA 4.0`, 90, 1828);
  ctx.fillText(siteDisplayUrl(), 90, 1862);
  await drawQr(ctx, shareUrl, 880, 1738, 134);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('生成图片失败'))), 'image/png');
    } catch (e) {
      reject(e);
    }
  });
}

export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** 系统分享（支持文件分享的移动端浏览器） */
export async function nativeShare(canvas: HTMLCanvasElement, filename: string, title: string, url: string): Promise<boolean> {
  try {
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], filename, { type: 'image/png' });
    const data: ShareData = { title, text: `${title} —— 来自 WikiCard`, url, files: [file] };
    if (navigator.canShare?.(data)) {
      await navigator.share(data);
      return true;
    }
    if (navigator.share) {
      await navigator.share({ title, text: `${title} —— 来自 WikiCard`, url });
      return true;
    }
  } catch {
    /* 用户取消 */
  }
  return false;
}

function safeDecode(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}
