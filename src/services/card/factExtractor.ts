/**
 * 趣味知识提取：只从 Wikipedia 摘要或正文中提取已有事实，不凭空编造。
 */

const ZH_HINTS = [
  '最大', '最小', '最高', '最长', '最早', '最古老', '最快', '最深', '最重', '最多', '最著名',
  '第一', '唯一', '首次', '首个', '世界上', '纪录', '约', '超过', '被称为', '发现', '命名', '相当于',
];
const EN_HINTS = [
  'largest', 'smallest', 'highest', 'longest', 'oldest', 'earliest', 'fastest', 'deepest', 'heaviest',
  'first', 'only', 'world', 'record', 'known as', 'discovered', 'named', 'approximately', 'more than',
  'unique', 'famous',
];

function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  if (/[一-鿿]/.test(t)) {
    return (t.match(/[^。！？!?]+[。！？!?]?/g) ?? []).map((s) => s.trim()).filter(Boolean);
  }
  return t
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreSentence(s: string, isZh: boolean): number {
  let score = 0;
  if (/\d/.test(s)) score += 2;
  const hints = isZh ? ZH_HINTS : EN_HINTS;
  const lower = s.toLowerCase();
  for (const h of hints) if (lower.includes(h)) score += 2;
  const len = s.length;
  const [min, max] = isZh ? [12, 110] : [40, 260];
  if (len < min || len > max) score -= 5;
  if (/[（(][^）)]*$/.test(s)) score -= 3; // 括号未闭合
  return score;
}

/** 从摘要中挑选一句趣味知识（跳过第一句定义句） */
export function extractFunFact(extract: string): string | undefined {
  const sentences = splitSentences(extract);
  if (sentences.length < 2) return undefined;
  const isZh = /[一-鿿]/.test(extract);
  const ranked = sentences
    .slice(1)
    .map((s) => ({ s, score: scoreSentence(s, isZh) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  return best && best.score >= 2 ? best.s : undefined;
}

export interface ArticleExtras {
  facts: string[];
  sections: string[];
  images: { src: string; caption?: string }[];
}

/** 从完整文章 HTML 中提取更多事实、章节和图片（卡牌详情页的扩展知识） */
export function extractFromHtml(html: string, maxFacts = 5): ArticleExtras {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, .reference, .mw-ref, sup, .navbox, .infobox, table, .hatnote, .mw-empty-elt').forEach((n) =>
    n.remove(),
  );
  const sections = Array.from(doc.querySelectorAll('h2'))
    .map((h) => h.textContent?.trim() ?? '')
    .filter((t) => t && !/参考|注释|外部链接|参见|延伸阅读|References|Notes|External links|See also|Further reading|Bibliography|来源|文献/i.test(t))
    .slice(0, 12);

  const paragraphs = Array.from(doc.querySelectorAll('section p, body > p'))
    .map((p) => p.textContent?.replace(/\[\d+\]/g, '').trim() ?? '')
    .filter((t) => t.length > 20);
  const text = paragraphs.slice(1, 40).join(' ');
  const isZh = /[一-鿿]/.test(text);
  const seen = new Set<string>();
  const facts = splitSentences(text)
    .map((s) => ({ s, score: scoreSentence(s, isZh) }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s)
    .filter((s) => {
      const k = s.slice(0, 20);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, maxFacts);

  const images = Array.from(doc.querySelectorAll('figure'))
    .map((fig) => {
      const img = fig.querySelector('img');
      let src = img?.getAttribute('src') ?? '';
      if (src.startsWith('//')) src = `https:${src}`;
      const caption = fig.querySelector('figcaption')?.textContent?.trim();
      const w = Number(img?.getAttribute('width') ?? 0);
      return { src, caption, w };
    })
    .filter((x) => x.src.startsWith('https://upload.wikimedia.org/') && (x.w === 0 || x.w >= 120))
    .slice(0, 6)
    .map(({ src, caption }) => ({ src, caption }));

  return { facts, sections, images };
}

/** 根据描述/摘要推断知识分类（随机盲盒使用） */
const CATEGORY_RULES: { category: string; zh: RegExp; en: RegExp }[] = [
  { category: '宇宙', zh: /行星|恒星|星系|星云|天体|小行星|彗星|卫星|天文|宇宙|黑洞|星座/, en: /planet|star|galaxy|nebula|asteroid|comet|astronom|constellation|moon|cosmic/i },
  { category: '动物', zh: /动物|物种|鸟|鱼|昆虫|哺乳|爬行|两栖|蛇|蜘蛛|甲虫|蛾|蝶/, en: /species|animal|bird|fish|insect|mammal|reptile|amphibian|beetle|moth|butterfly|spider|genus of/i },
  { category: '植物', zh: /植物|花|树|草本|灌木|蕨|藻|真菌|菌/, en: /plant|flower|tree|shrub|herb|fern|alga|fung/i },
  { category: '人物', zh: /政治家|科学家|作家|演员|歌手|运动员|画家|诗人|哲学家|皇帝|国王|将军|导演|音乐家|球员/, en: /politician|scientist|writer|actor|actress|singer|athlete|painter|poet|philosopher|emperor|king|general|director|musician|player|footballer/i },
  { category: '地理', zh: /城市|村|镇|县|省|河流|湖|山|岛|国家|地区|乡|区|州/, en: /city|village|town|county|province|river|lake|mountain|island|country|region|municipality|district/i },
  { category: '历史', zh: /王朝|战争|战役|帝国|古代|朝代|历史|考古|事件|条约/, en: /dynasty|war|battle|empire|ancient|history|archaeolog|treaty|century/i },
  { category: '科学', zh: /化学|物理|数学|生物学|元素|化合物|理论|定理|蛋白|基因|疾病|医学/, en: /chemical|physics|mathemat|biolog|element|compound|theory|theorem|protein|gene|disease|medic/i },
  { category: '神秘', zh: /神话|传说|未解|超自然|神祇|妖怪/, en: /myth|legend|unsolved|paranormal|deity|folklore/i },
];

export function inferCategory(text: string, fallback = '综合'): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.zh.test(text) || rule.en.test(text)) return rule.category;
  }
  return fallback;
}
