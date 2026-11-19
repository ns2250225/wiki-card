import type { CardPack } from '@/types';

/**
 * 卡包配置：只保存搜索规则，不保存任何具体卡牌或知识内容。
 */
export const PACKS: CardPack[] = [
  {
    id: 'space',
    name: '宇宙探索',
    description: '探索宇宙中的奇妙知识',
    coverTheme: 'space',
    category: '宇宙',
    searchQueries: ['宇宙', '星系', '行星', '黑洞', '天文学', '恒星', '星云', '卫星'],
    localizedQueries: {
      en: ['universe', 'galaxy', 'planet', 'black hole', 'astronomy', 'star', 'nebula', 'moon'],
    },
    language: 'zh',
    enabled: true,
    accent: '#398BFF',
  },
  {
    id: 'animals',
    name: '神奇动物',
    description: '认识地球上千奇百怪的生灵',
    coverTheme: 'animals',
    category: '动物',
    searchQueries: ['动物', '海洋生物', '昆虫', '哺乳动物', '鸟类', '爬行动物', '鱼类'],
    localizedQueries: {
      en: ['animal', 'marine life', 'insect', 'mammal', 'bird', 'reptile', 'fish species'],
    },
    language: 'zh',
    enabled: true,
    accent: '#3FD08A',
  },
  {
    id: 'plants',
    name: '植物世界',
    description: '走进绿意盎然的植物王国',
    coverTheme: 'plants',
    category: '植物',
    searchQueries: ['植物', '花卉', '树木', '被子植物', '蕨类', '药用植物', '真菌'],
    localizedQueries: {
      en: ['plant', 'flower', 'tree', 'flowering plant', 'fern', 'medicinal plant', 'fungus'],
    },
    language: 'zh',
    enabled: true,
    accent: '#7BD84A',
  },
  {
    id: 'civilization',
    name: '人类文明',
    description: '穿越时空，回望人类的足迹',
    coverTheme: 'civilization',
    category: '历史',
    searchQueries: ['文明', '历史', '考古', '古代王朝', '帝国', '古城', '文物'],
    localizedQueries: {
      en: ['civilization', 'ancient history', 'archaeology', 'dynasty', 'empire', 'ancient city', 'artifact'],
    },
    language: 'zh',
    enabled: true,
    accent: '#E0A45A',
  },
  {
    id: 'science',
    name: '科学奇迹',
    description: '揭开自然规律背后的奥秘',
    coverTheme: 'science',
    category: '科学',
    searchQueries: ['物理学', '化学', '生物学', '量子', '化学元素', '定律', '发明'],
    localizedQueries: {
      en: ['physics', 'chemistry', 'biology', 'quantum', 'chemical element', 'scientific law', 'invention'],
    },
    language: 'zh',
    enabled: true,
    accent: '#33D6E0',
  },
  {
    id: 'wonders',
    name: '世界奇观',
    description: '环游世界的壮丽风景与建筑',
    coverTheme: 'wonders',
    category: '地理',
    searchQueries: ['世界遗产', '建筑', '自然景观', '山脉', '湖泊', '瀑布', '岛屿'],
    localizedQueries: {
      en: ['world heritage site', 'architecture', 'natural landmark', 'mountain range', 'lake', 'waterfall', 'island'],
    },
    language: 'zh',
    enabled: true,
    accent: '#5AA8E0',
  },
  {
    id: 'people',
    name: '伟大人物',
    description: '与改变世界的人们相遇',
    coverTheme: 'people',
    category: '人物',
    searchQueries: ['科学家', '艺术家', '历史人物', '哲学家', '发明家', '作家', '探险家'],
    localizedQueries: {
      en: ['scientist', 'artist', 'historical figure', 'philosopher', 'inventor', 'writer', 'explorer'],
    },
    language: 'zh',
    enabled: true,
    accent: '#FF8A5C',
  },
  {
    id: 'mystery',
    name: '神秘未知',
    description: '那些至今仍令人着迷的谜团',
    coverTheme: 'mystery',
    category: '神秘',
    searchQueries: ['未解之谜', '考古发现', '自然现象', '神话', '传说生物', '失落的城市', '超自然'],
    localizedQueries: {
      en: [
        'unsolved mystery',
        'archaeological discovery',
        'natural phenomenon',
        'mythology',
        'legendary creature',
        'lost city',
        'paranormal',
      ],
    },
    language: 'zh',
    enabled: true,
    accent: '#A45CFF',
  },
  {
    id: 'random',
    name: '随机盲盒',
    description: '今天会发现什么知识？',
    coverTheme: 'random',
    category: '综合',
    searchQueries: [],
    language: 'zh',
    enabled: true,
    random: true,
    accent: '#FF5DB7',
  },
];

export const THEME_PACKS = PACKS.filter((p) => p.enabled && !p.random);
export const RANDOM_PACK = PACKS.find((p) => p.random)!;

export function getPackConfig(id: string): CardPack | undefined {
  return PACKS.find((p) => p.id === id && p.enabled);
}

export function getPackQueries(pack: CardPack, language: string): string[] {
  if (language === pack.language) return pack.searchQueries;
  return pack.localizedQueries?.[language] ?? pack.searchQueries;
}

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  PACKS.map((p) => [p.category, p.accent]),
);
