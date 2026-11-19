# WikiCard —— Wikipedia 知识盲盒网页游戏 PRD

> Open a Pack, Discover a World.
>
> 打开一包，发现一个世界。

| 项目 | 说明 |
|---|---|
| 产品名称 | WikiCard |
| 产品类型 | 知识盲盒 / 卡牌收集 / 知识探索 |
| 产品形态 | 纯前端网页游戏 |
| 知识来源 | Wikipedia API |
| 图片来源 | Wikipedia / Wikimedia Commons |
| 前端框架 | Vue 3 + TypeScript |
| 数据存储 | IndexedDB |
| 后端 | 无 |
| 用户系统 | 无注册、无登录 |
| 卡牌数据 | 实时调用 Wikipedia API 动态生成 |
| 部署方式 | GitHub Pages / Cloudflare Pages |
| 目标平台 | PC 浏览器、移动端浏览器 |

---

# 一、产品概述

## 1.1 产品背景

Wikipedia 拥有海量知识条目，涵盖科学、历史、地理、宇宙、动物、植物、人物、建筑等领域。

传统百科阅读需要用户主动搜索和选择内容，缺乏探索的随机性和游戏乐趣。

WikiCard 希望将 Wikipedia 变成一个知识盲盒。

用户选择一个主题卡包，点击开启，系统实时从 Wikipedia 获取相关知识条目，自动生成5张具有不同稀有度的知识卡牌。

每张卡牌包含：

- 知识标题。
- 知识插图。
- 知识简介。
- 趣味知识。
- 知识分类。
- 稀有度。
- Wikipedia 原文链接。

用户可以收集卡牌、完成图鉴、分享抽卡结果，并跳转到 Wikipedia 深入阅读。

## 1.2 核心理念

**不预置知识，每次开包都是一次知识探索。**

与传统卡牌收集游戏不同，WikiCard 的知识卡牌不是开发者提前制作好的固定资源，而是根据用户的抽卡行为实时从 Wikipedia 获取。

## 1.3 核心玩法

```text
选择一个主题卡包
       |
       v
点击开启卡包
       |
       v
调用 Wikipedia API
       |
       v
搜索相关知识条目
       |
       v
获取5个不同的百科条目
       |
       v
获取摘要、图片和文章信息
       |
       v
随机分配卡牌稀有度
       |
       v
动态生成5张知识卡牌
       |
       v
播放拆包及翻牌动画
       |
       v
自动保存本地收藏
       |
       v
分享卡包 / 查看百科原文
```

## 1.4 产品原则

1. 不预置卡牌数据库。
2. 不预置固定知识内容。
3. 每次抽卡优先从 Wikipedia 实时获取新知识。
4. 使用 Wikipedia 原始内容生成卡牌。
5. 同一包内不允许出现相同知识条目。
6. 卡牌可以重复获得。
7. 所有个人游戏数据保存在浏览器。
8. 不需要注册、登录或后端服务。

---

# 二、产品范围

## 2.1 必须实现

| 功能 | 说明 |
|---|---|
| 动态知识搜索 | 调用 Wikipedia API 搜索知识 |
| 动态卡牌生成 | 根据 API 返回数据生成卡牌 |
| 主题卡包 | 按知识领域搜索不同条目 |
| 随机卡包 | 随机探索 Wikipedia |
| 稀有度系统 | 五级稀有度 |
| 抽卡系统 | 每包固定5张 |
| 拆包动画 | 撕开卡包、卡牌飞出 |
| 翻牌动画 | 逐张翻开卡牌 |
| 本地收藏 | IndexedDB 保存卡牌 |
| 图鉴系统 | 查看已收集知识 |
| 重复卡牌 | 统计重复获得数量 |
| Wikipedia 跳转 | 阅读原始百科文章 |
| 分享功能 | 生成单卡及整包海报 |
| 分享链接 | 通过文章ID或标题恢复分享内容 |
| 存档管理 | 导入、导出 JSON |
| PWA | 支持静态资源离线缓存 |

## 2.2 明确不做

- 不做用户注册。
- 不做用户登录。
- 不做后端服务器。
- 不做云端数据库。
- 不做预置知识卡牌库。
- 不做预置卡牌图片库。
- 不做卡牌交易。
- 不做玩家对战。
- 不做在线排行榜。
- 不做云端收藏同步。

---

# 三、Wikipedia API 数据架构

这是整个项目最重要的部分。

所有新卡牌都必须通过 Wikipedia API 动态获取。

## 3.1 API 选择

优先采用 MediaWiki REST API，必要时使用 Action API 补充功能。

官方文档：

- https://www.mediawiki.org/wiki/API:REST_API
- https://www.mediawiki.org/wiki/API:REST_API/Reference
- https://www.mediawiki.org/wiki/API:REST_API/Get_started
- https://www.mediawiki.org/wiki/Manual:CORS

## 3.2 API 功能分工

| 功能 | API | 用途 |
|---|---|---|
| 搜索文章 | REST Search API | 根据主题搜索文章 |
| 获取文章摘要 | REST Summary API | 获取标题、简介、摘要、图片 |
| 获取文章详情 | REST Page API | 获取文章信息及版本 |
| 获取文章 HTML | REST HTML API | 获取文章完整内容 |
| 获取随机文章 | Action API | 随机知识探索 |
| 获取文章图片 | Summary / Commons API | 获取文章图片 |
| 获取多语言文章 | REST Language API | 查询其他语言版本 |

## 3.3 主要 API 接口

### A. 搜索 Wikipedia 文章

接口：

```http
GET https://zh.wikipedia.org/w/rest.php/v1/search/page?q=黑洞&limit=20
```

用途：

- 根据主题搜索文章。
- 获取候选文章列表。
- 获取文章ID。
- 获取文章标题。
- 获取文章描述。
- 获取缩略图。

返回数据示例：

```json
{
  "pages": [
    {
      "id": 12345,
      "key": "黑洞",
      "title": "黑洞",
      "excerpt": "黑洞是一种引力极强的天体...",
      "description": "一种引力极强的天体",
      "thumbnail": {
        "url": "https://upload.wikimedia.org/..."
      }
    }
  ]
}
```

### B. 获取文章摘要

接口：

```http
GET https://zh.wikipedia.org/api/rest_v1/page/summary/黑洞
```

用途：

- 获取文章完整标题。
- 获取文章描述。
- 获取第一段摘要。
- 获取文章主图。
- 获取 Wikipedia 原文地址。
- 获取 Wikidata ID。

主要字段：

```typescript
interface WikiSummary {
  type: string;
  title: string;
  displaytitle?: string;
  description?: string;
  extract: string;

  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };

  originalimage?: {
    source: string;
    width: number;
    height: number;
  };

  content_urls: {
    desktop: {
      page: string;
    };
  };

  wikibase_item?: string;
}
```

需要检查文章类型，跳过消歧义页面和不适合制作卡牌的页面。

### C. 获取文章详细信息

接口：

```http
GET https://zh.wikipedia.org/w/rest.php/v1/page/黑洞/bare
```

用途：

- 获取文章ID。
- 获取页面标题。
- 获取最新修订版本。
- 获取页面许可信息。
- 获取文章HTML地址。

### D. 获取文章完整HTML

接口：

```http
GET https://zh.wikipedia.org/api/rest_v1/page/html/黑洞
```

用途：

- 提取更多知识内容。
- 查找文章中的有趣事实。
- 获取文章中的图片和章节。
- 为卡牌详情页面提供扩展知识。

完整HTML不是每次抽卡都必须获取的内容，只有在需要补充知识详情时才请求。

### E. 随机文章

使用 Wikipedia Action API：

```http
GET https://zh.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=10&format=json&origin=*
```

用途：

- 随机探索知识。
- 随机知识卡包。
- 发现意料之外的百科条目。

注意：随机结果可能包含不适合展示的条目，需要进行筛选。

## 3.4 API 请求原则

- 只请求公开可访问的 Wikipedia 内容。
- 优先使用 GET 请求。
- 对同一文章避免重复请求。
- 使用缓存减少 API 请求量。
- 支持请求失败重试。
- 使用并发限制。
- 处理 404、429、5xx 等错误。
- 遵守 Wikimedia API 使用政策。
- 不通过多个请求无限刷取文章。

浏览器直接请求 API 时，必须注意 CORS。REST API 和 Action API 的跨域请求方式并不完全相同，Action API 应使用 `origin=*` 参数。不能假设所有 Wikimedia 接口都允许任意跨域请求。

---

# 四、卡包系统

## 4.1 卡包设计

卡包不再对应固定的卡牌ID列表，而是对应一个 Wikipedia 搜索主题。

例如：

| 卡包 | 搜索关键词 | 内容方向 |
|---|---|---|
| 宇宙探索 | 宇宙、星系、行星、天文学 | 宇宙知识 |
| 神奇动物 | 动物、海洋生物、昆虫 | 动物知识 |
| 植物世界 | 植物、花卉、树木 | 植物知识 |
| 人类文明 | 文明、历史、考古 | 历史知识 |
| 科学奇迹 | 物理、化学、生物 | 科学知识 |
| 世界奇观 | 地理、建筑、自然景观 | 地理知识 |
| 伟大人物 | 科学家、艺术家、历史人物 | 人物知识 |
| 神秘未知 | 未解之谜、考古、自然现象 | 神秘知识 |
| 随机盲盒 | 随机百科条目 | 全领域知识 |

卡包配置仅保存搜索规则，不保存具体卡牌。

## 4.2 卡包配置结构

```typescript
interface CardPack {
  id: string;
  name: string;
  description: string;

  coverTheme: string;

  searchQueries: string[];

  language: string;

  enabled: boolean;
}
```

例如：

```json
{
  "id": "space",
  "name": "宇宙探索",
  "description": "探索宇宙中的奇妙知识",
  "coverTheme": "space",
  "searchQueries": [
    "宇宙",
    "星系",
    "行星",
    "黑洞",
    "天文学"
  ],
  "language": "zh",
  "enabled": true
}
```

这里的配置只是搜索规则，不是预置卡牌。

## 4.3 卡包封面

卡包封面不依赖预置知识图片。

使用 CSS、SVG、Canvas 动态绘制主题封面。

例如：

- 宇宙探索：星球、星空、轨道。
- 神奇动物：动物剪影。
- 科学奇迹：分子结构、原子轨道。
- 历史文明：古代建筑轮廓。
- 随机盲盒：彩色问号和几何图案。

卡包封面与实际抽出的卡牌内容无关。

---

# 五、动态卡牌生成系统

## 5.1 核心机制

用户开启卡包时，系统实时从 Wikipedia 获取文章，并将文章转换为游戏卡牌。

动态生成过程：

```text
用户点击开启卡包
        |
        v
读取卡包搜索规则
        |
        v
调用 Wikipedia Search API
        |
        v
获取候选文章列表
        |
        v
随机打乱候选文章
        |
        v
过滤重复及无效文章
        |
        v
选取5个不同文章
        |
        v
获取每篇文章的摘要
        |
        v
提取文章图片
        |
        v
生成卡牌数据
        |
        v
随机分配稀有度
        |
        v
生成5张知识卡牌
        |
        v
保存本地收藏
```

## 5.2 卡牌数据结构

```typescript
interface WikiCard {
  id: string;

  pageId: number;
  title: string;
  description: string;
  extract: string;

  category: string;
  rarity: Rarity;

  imageUrl?: string;
  originalImageUrl?: string;

  wikiUrl: string;
  wikiLanguage: string;

  wikibaseItem?: string;

  revisionId?: number;
  sourceLicense?: string;

  createdAt: number;
}

type Rarity =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic';
```

### 卡牌唯一性

卡牌唯一标识：

```text
语言代码 + Wikipedia Page ID
```

例如：

```text
zh:12345
en:67890
```

同一篇中文文章不会因为多次抽取而产生不同的卡牌身份。

同一知识的中文版本和英文版本默认视为不同来源卡牌，后续可以通过 Wikidata ID 建立跨语言关联。

## 5.3 卡牌内容生成规则

卡牌标题：

直接使用 Wikipedia 返回的文章标题。

卡牌描述：

优先使用 Wikipedia 的 description。

知识简介：

使用 Wikipedia Summary API 返回的 extract。

知识图片：

优先使用 thumbnail 或 originalimage。

知识来源：

使用 content_urls.desktop.page。

趣味知识：

优先从文章摘要或正文中提取已有事实，不得凭空编造。

如果没有足够内容：

- 隐藏趣味知识区域。
- 不影响卡牌生成。
- 允许卡牌只展示标题、摘要和图片。

MVP 不依赖 AI API，不需要额外的大模型服务。

## 5.4 图片处理

图片优先级：

1. Wikipedia 文章主图。
2. Wikipedia 缩略图。
3. Wikimedia Commons 相关图片。
4. 无图片时使用动态生成的主题背景。

图片显示要求：

- 使用懒加载。
- 保持图片比例。
- 避免拉伸。
- 加载失败使用默认背景。
- 优先使用 HTTPS 图片。
- 保存图片来源和许可信息。

## 5.5 卡牌稀有度

稀有度由游戏系统随机分配，与 Wikipedia 文章的实际重要性无关。

| 稀有度 | 概率 | 效果 |
|---|---:|---|
| 普通 Common | 55% | 灰色边框 |
| 稀有 Rare | 25% | 蓝色边框 |
| 史诗 Epic | 13% | 紫色边框 |
| 传说 Legendary | 6% | 金色边框 |
| 神话 Mythic | 1% | 彩虹全息效果 |

每次动态生成卡牌时随机分配稀有度。

同一张文章卡牌第一次获得时确定其稀有度，并保存在本地收藏中。

后续重复获得时，默认沿用该卡牌第一次获得的稀有度，避免同一张卡牌在收藏中出现多个稀有度。

## 5.6 卡牌去重规则

单包规则：

- 每包必须有5张卡牌。
- 同包不允许出现相同 pageId 和语言组合。
- 如果候选文章不足5个，继续搜索。
- 搜索仍不足时，显示提示，不允许用重复卡牌凑数。

跨包规则：

- 可以重复获得以前收集的卡牌。
- 重复获得增加卡牌数量。
- 不重复增加图鉴完成率。

---

# 六、抽卡系统

## 6.1 开包流程

```text
选择卡包
   |
   v
检查免费次数
   |
   v
进入准备动画
   |
   v
调用 Wikipedia API
   |
   v
动态获取5张知识卡牌
   |
   v
完成稀有度分配
   |
   v
保存抽卡结果
   |
   v
播放卡包拆封动画
   |
   v
五张卡牌依次翻转
   |
   v
展示最终结果
```

## 6.2 加载体验

由于卡牌来自实时 API，抽卡前需要展示加载状态。

加载动画文案：

- 正在探索 Wikipedia...
- 正在寻找未知知识...
- 正在收集百科条目...
- 正在生成你的知识卡牌...

加载过程中展示动态星空、知识节点或旋转盲盒。

要求：

- 请求过程展示进度提示。
- 不允许用户重复点击开包。
- 请求失败允许重试。
- 已获取的卡牌可以先缓存，避免重新请求。

## 6.3 请求失败处理

| 场景 | 处理 |
|---|---|
| 搜索 API 失败 | 提示网络异常 |
| 摘要 API 失败 | 尝试重新请求 |
| 文章不存在 | 跳过该文章 |
| 没有图片 | 使用默认背景 |
| 候选不足5篇 | 扩大搜索关键词 |
| 连续请求失败 | 终止开包，返还免费次数 |
| Wikipedia 限流 | 暂停请求，提示稍后重试 |
| 用户关闭页面 | 已完成并保存的结果保留 |

只有成功生成并保存5张卡牌后，才正式扣除一次免费次数。

## 6.4 保底机制

| 类型 | 规则 |
|---|---|
| 史诗保底 | 连续20抽未获得史诗及以上 |
| 传说保底 | 连续50抽未获得传说及以上 |
| 神话保底 | 连续100抽未获得神话 |

保底以实际抽取的卡牌数量为单位。

保底逻辑在本地执行。

由于没有后端，用户可以通过修改本地存档绕过限制，保底仅用于游戏体验。

---

# 七、卡牌视觉设计

## 7.1 卡牌尺寸

采用竖版3:4比例。

## 7.2 卡牌正面

```text
┌──────────────────────┐
│       LEGENDARY       │
│                      │
│                      │
│      知识图片        │
│                      │
│                      │
├──────────────────────┤
│                      │
│         黑洞         │
│       BLACK HOLE     │
│                      │
│        宇宙           │
│                      │
│  一种引力极强的时空   │
│  区域，光也无法逃逸   │
│                      │
│       WIKICARD       │
│        #12345        │
└──────────────────────┘
```

## 7.3 稀有度效果

普通：

- 灰白边框。
- 简单阴影。

稀有：

- 蓝色边框。
- 微弱光效。

史诗：

- 紫色渐变。
- 粒子效果。

传说：

- 金色边框。
- 金色光柱。

神话：

- 彩虹渐变。
- 全息动态效果。
- 特殊粒子和音效。

## 7.4 卡牌背面

- WikiCard Logo。
- 知识宇宙图案。
- 几何纹理。
- 动态星光。
- 统一设计。

---

# 八、图鉴与收藏系统

## 8.1 收藏逻辑

用户抽到卡牌后，自动写入 IndexedDB。

数据分为：

1. 卡牌基础信息。
2. 用户收藏信息。
3. 抽卡历史。

卡牌基础信息来自 API，保存在本地作为缓存，不属于预置卡牌数据库。

## 8.2 图鉴

图鉴展示用户已经发现的 Wikipedia 知识。

分为：

- 全部卡牌。
- 已收集。
- 未收集。
- 按分类。
- 按稀有度。
- 按时间排序。

由于不再有固定卡牌总量，因此不设置固定的500张完成进度。

改为动态统计：

- 累计发现知识数量。
- 累计开启卡包数量。
- 已探索知识领域数量。
- 各稀有度卡牌数量。
- 重复获得数量。

未收集区域不需要预先列出全部 Wikipedia 文章。

## 8.3 卡牌详情

展示：

- 卡牌图片。
- 标题。
- 描述。
- 知识简介。
- 稀有度。
- 分类。
- 获得时间。
- 拥有数量。
- Wikipedia 来源链接。

提供按钮：

「在 Wikipedia 中阅读完整文章」

点击新标签页打开对应文章。

---

# 九、分享系统

## 9.1 单卡分享

Canvas 动态生成1080 × 1440 PNG。

包含：

- 知识卡牌。
- 卡牌标题。
- 稀有度。
- 知识简介。
- Wikipedia 来源。
- WikiCard Logo。
- 网站地址或二维码。

## 9.2 整包分享

生成1080 × 1920海报。

包含本次抽取的5张卡牌。

展示：

- 卡包主题。
- 五张卡牌。
- 最高稀有度。
- 本次新获得数量。
- WikiCard Logo。

## 9.3 分享链接

分享链接不依赖服务器。

使用文章ID和语言代码恢复卡牌。

例如：

```text
https://example.com/share?cards=zh:12345,en:67890,zh:23456,zh:34567,zh:45678
```

分享页面加载后：

1. 解析卡牌ID。
2. 根据语言访问对应 Wikipedia。
3. 获取文章摘要。
4. 动态生成卡牌。
5. 展示5张分享卡牌。

分享链接不依赖分享者的本地存档。

如果分享页面 API 加载失败，展示重试按钮和原始 Wikipedia 链接。

---

# 十、首页设计

## 10.1 首页布局

```text
┌──────────────────────────────────────────┐
│ WIKICARD       首页  卡包  图鉴  收藏 设置 │
├──────────────────────────────────────────┤
│                                          │
│             DISCOVER KNOWLEDGE           │
│                                          │
│           打开一包，发现一个世界           │
│                                          │
│             [开启今日免费卡包]             │
│                                          │
│                3 / 3                     │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│                主题卡包                  │
│                                          │
│ [宇宙] [动物] [历史] [科学] [自然]        │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│                随机盲盒                  │
│                                          │
│          今天会发现什么知识？             │
│                                          │
│             [随机开启]                   │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│                最近获得                  │
│                                          │
│       [卡牌] [卡牌] [卡牌] [卡牌]          │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│                我的收藏                  │
│                                          │
│          已发现 126 个知识                │
│                                          │
└──────────────────────────────────────────┘
```

## 10.2 首页功能

- 每日免费卡包。
- 主题卡包。
- 随机盲盒。
- 最近获得。
- 收藏统计。
- 热门知识推荐。

热门知识推荐也通过 Wikipedia API 动态获取，不使用预置卡牌。

---

# 十一、本地数据库

使用 IndexedDB + Dexie.js。

## 11.1 数据表

| 数据表 | 用途 |
|---|---|
| cards | 已获取的 Wikipedia 卡牌缓存 |
| collection | 用户收藏数量 |
| packHistory | 历史开包记录 |
| apiCache | API 响应缓存 |
| gameStats | 抽卡统计和保底数据 |
| settings | 游戏设置 |

注意：cards 表只保存用户实际发现的卡牌，不在项目初始化时导入任何知识卡牌。

## 11.2 卡牌表

```typescript
interface CardRecord {
  id: string;
  pageId: number;
  language: string;

  title: string;
  description: string;
  extract: string;

  imageUrl?: string;
  wikiUrl: string;

  rarity: string;
  createdAt: number;
}
```

## 11.3 收藏表

```typescript
interface CollectionRecord {
  cardId: string;

  count: number;

  firstObtainedAt: number;
  lastObtainedAt: number;
}
```

## 11.4 抽卡记录

```typescript
interface PackHistory {
  id: string;

  packId: string;
  cardIds: string[];

  createdAt: number;

  highestRarity: string;
  newCardCount: number;
  duplicateCount: number;
}
```

## 11.5 API 缓存

缓存策略：

| 数据 | 缓存时间 |
|---|---|
| 文章标题及ID | 长期 |
| 文章摘要 | 7天 |
| 文章图片URL | 7天 |
| 文章详细内容 | 1天 |
| 搜索结果 | 1小时 |

缓存时间是产品建议值，实际应尊重 API 缓存策略和响应头。

---

# 十二、每日免费机制

每日赠送3包。

规则：

- 每日3次免费开启机会。
- 每次固定5张卡牌。
- 按浏览器本地日期重置。
- 开包成功后扣除次数。
- API 失败不扣次数。
- 用户可以随时查看剩余次数。

不提供广告和支付功能。

每日次数仅用于娱乐体验，不具备防作弊能力。

---

# 十三、数据采集和 API 服务模块

## 13.1 前端服务结构

```text
src/
├── services/
│   ├── wikipedia/
│   │   ├── search.ts
│   │   ├── summary.ts
│   │   ├── page.ts
│   │   ├── random.ts
│   │   ├── commons.ts
│   │   └── index.ts
│   │
│   ├── card/
│   │   ├── cardGenerator.ts
│   │   ├── rarityGenerator.ts
│   │   └── cardValidator.ts
│   │
│   ├── pack/
│   │   ├── packService.ts
│   │   ├── packOpening.ts
│   │   └── packConfig.ts
│   │
│   ├── collection/
│   │   └── collectionService.ts
│   │
│   └── share/
│       ├── posterGenerator.ts
│       └── shareUrl.ts
```

## 13.2 Wikipedia 服务接口

```typescript
interface WikipediaService {
  searchArticles(
    query: string,
    limit?: number
  ): Promise<WikiSearchResult[]>;

  getArticleSummary(
    title: string,
    language?: string
  ): Promise<WikiSummary>;

  getArticleDetail(
    title: string,
    language?: string
  ): Promise<WikiPageDetail>;

  getRandomArticles(
    count: number
  ): Promise<WikiSearchResult[]>;
}
```

## 13.3 动态生成服务

```typescript
interface CardGenerator {
  generatePack(
    packId: string,
    count: number
  ): Promise<WikiCard[]>;
}
```

执行过程：

1. 获取卡包搜索关键词。
2. 执行 Wikipedia 搜索。
3. 获取候选文章。
4. 随机排序。
5. 检查本包重复。
6. 获取5篇文章的摘要。
7. 过滤无效页面。
8. 分配稀有度。
9. 生成卡牌。
10. 返回5张卡牌。

如果一个关键词无法提供足够的文章，自动使用同主题的其他关键词补充。

## 13.4 请求优化

不能在一次抽卡中无节制地请求 Wikipedia。

要求：

- 搜索请求优先合并。
- 候选文章一次获取多条。
- 摘要请求限制并发数量，例如最多3个同时请求。
- 相同页面使用缓存。
- 设置请求超时。
- 失败使用指数退避重试。
- 遵循服务器 Retry-After 响应头。
- 避免无限递归搜索。
- 达到请求上限后停止并提示用户。

## 13.5 CORS 与纯前端限制

必须通过实际浏览器测试验证所有 API。

REST API 和 Action API 分别实现对应的跨域请求方式。

如果某个 Wikimedia 接口不支持浏览器跨域访问：

- 优先寻找支持 CORS 的替代接口。
- 不允许偷偷引入后端代理。
- 不允许依赖第三方不稳定代理。

如果无法直接从浏览器获取某项数据，则放弃该项非核心功能，使用已有摘要数据代替。

---

# 十四、项目技术架构

## 14.1 技术选型

| 模块 | 技术 |
|---|---|
| 前端 | Vue 3 |
| 开发语言 | TypeScript |
| 构建工具 | Vite |
| UI | Tailwind CSS |
| 状态管理 | Pinia |
| 本地数据库 | Dexie.js |
| 动画 | GSAP |
| 图片生成 | Canvas API |
| 路由 | Vue Router |
| 图标 | Lucide |
| 离线缓存 | PWA / Service Worker |

## 14.2 项目目录

```text
wikicard/
│
├── public/
│   ├── icons/
│   ├── fonts/
│   └── manifest.json
│
├── src/
│   ├── components/
│   │   ├── WikiCard.vue
│   │   ├── CardPack.vue
│   │   ├── CardFlip.vue
│   │   ├── PackOpening.vue
│   │   ├── RarityEffect.vue
│   │   ├── LoadingKnowledge.vue
│   │   ├── CardGrid.vue
│   │   └── SharePoster.vue
│   │
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── PacksView.vue
│   │   ├── OpeningView.vue
│   │   ├── CardDetailView.vue
│   │   ├── CollectionView.vue
│   │   ├── ShareView.vue
│   │   └── SettingsView.vue
│   │
│   ├── services/
│   │   ├── wikipedia/
│   │   ├── card/
│   │   ├── pack/
│   │   ├── collection/
│   │   └── share/
│   │
│   ├── database/
│   │   ├── db.ts
│   │   ├── migrations.ts
│   │   └── saveManager.ts
│   │
│   ├── stores/
│   │   ├── cardStore.ts
│   │   ├── packStore.ts
│   │   ├── collectionStore.ts
│   │   └── gameStore.ts
│   │
│   ├── config/
│   │   ├── packs.ts
│   │   └── rarity.ts
│   │
│   ├── utils/
│   │   ├── random.ts
│   │   ├── cache.ts
│   │   ├── image.ts
│   │   └── date.ts
│   │
│   ├── router/
│   │   └── index.ts
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── cards.css
│   │   └── animations.css
│   │
│   ├── App.vue
│   └── main.ts
│
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## 14.3 数据架构

```text
                 静态网页
                    |
                    v
                 Vue 3
                    |
          ┌─────────┴─────────┐
          |                   |
          v                   v
      卡包配置             用户操作
          |                   |
          v                   v
    Wikipedia API        抽卡服务
          |                   |
          v                   v
      搜索文章             卡牌生成
          |                   |
          v                   v
      获取摘要             稀有度分配
          |                   |
          └─────────┬─────────┘
                    |
                    v
                Pinia Store
                    |
                    v
                IndexedDB
                    |
                    v
                本地收藏
```

---

# 十五、存档导入导出

## 15.1 自动保存

以下数据自动保存：

- 已发现卡牌。
- 卡牌稀有度。
- 收藏数量。
- 抽卡历史。
- 每日免费次数。
- 保底计数。
- 游戏设置。

## 15.2 导出存档

生成：

```text
wikicard-save-2026-11-19.json
```

存档示例：

```typescript
interface GameSave {
  version: number;
  exportedAt: string;

  cards: WikiCard[];

  collection: CollectionRecord[];

  packHistory: PackHistory[];

  stats: {
    totalOpens: number;
    totalCards: number;

    epicPity: number;
    legendaryPity: number;
    mythicPity: number;

    lastOpenDate: string;
    dailyOpenedCount: number;
  };
}
```

## 15.3 导入存档

- 验证 JSON 格式。
- 验证版本号。
- 验证卡牌字段。
- 验证卡牌ID。
- 展示存档统计。
- 确认覆盖当前数据。
- 恢复 IndexedDB。

由于知识卡牌不是预置数据，导入存档时必须同时恢复卡牌基础信息。

---

# 十六、UI视觉规范

## 16.1 整体风格

深色背景 + 数字收藏卡牌 + 知识探索视觉。

参考：

- Pokémon TCG。
- Hearthstone。
- Steam 集换式卡牌。
- 科幻知识图鉴。

## 16.2 主色

| 用途 | 颜色 |
|---|---|
| 背景 | #11131B |
| 次级背景 | #1C2030 |
| 普通卡 | #A5A9B5 |
| 稀有卡 | #398BFF |
| 史诗卡 | #A45CFF |
| 传说卡 | #FFC247 |
| 神话卡 | #FF5DB7 |
| 正文 | #F5F5F7 |

## 16.3 动画

- 卡包悬浮。
- 卡包震动。
- 卡包撕开。
- 五张卡牌飞出。
- 卡牌逐张翻转。
- 稀有度特效。
- 卡牌收藏飞入图鉴。

支持设置关闭动画和音效。

---

# 十七、性能及兼容性

## 17.1 性能要求

- 页面首屏尽量控制在2秒内。
- API 请求采用并发控制。
- 抽卡时显示加载状态。
- 卡牌图片懒加载。
- 图片加载失败使用默认背景。
- IndexedDB 写入异步执行。
- 卡牌动画目标60 FPS。
- 搜索和摘要结果尽可能复用缓存。

首屏不需要请求 Wikipedia 全部数据。

## 17.2 浏览器兼容

- Chrome。
- Edge。
- Firefox。
- Safari。

## 17.3 离线模式

由于知识来自实时 Wikipedia API，离线时不能发现全新的知识。

离线状态下：

- 可以查看已经缓存的卡牌。
- 可以查看收藏。
- 可以查看历史抽卡记录。
- 可以生成已缓存卡牌的分享海报。
- 不能进行新的实时知识抽卡。
- 可以进入离线提示页面。

---

# 十八、开发计划

## 第一阶段：基础项目

- Vue 3 + TypeScript。
- Tailwind CSS。
- Pinia。
- Dexie.js。
- Vue Router。
- 首页和导航布局。

## 第二阶段：Wikipedia API

- 实现搜索 API。
- 实现文章摘要 API。
- 实现文章详情 API。
- 实现随机文章 API。
- 实现图片提取。
- 实现 CORS 测试。
- 实现请求缓存。
- 实现失败重试。

## 第三阶段：动态卡牌

- 动态获取文章。
- 自动生成卡牌数据。
- 图片和摘要展示。
- 五级稀有度。
- 卡牌唯一ID。
- 卡牌去重。
- 无图片降级。

## 第四阶段：卡包系统

- 实现9种主题卡包。
- 实现关键词搜索。
- 实现随机盲盒。
- 每包5张。
- 实现抽卡算法。
- 实现保底机制。
- 实现拆包动画。

## 第五阶段：收藏图鉴

- IndexedDB。
- 卡牌收藏。
- 重复卡牌。
- 收藏统计。
- 卡牌搜索。
- 分类筛选。

## 第六阶段：分享系统

- 单卡海报。
- 整包海报。
- Canvas 图片生成。
- PNG 下载。
- URL 参数分享。
- 分享页面恢复。

## 第七阶段：存档和部署

- 自动存档。
- JSON 导出。
- JSON 导入。
- 数据迁移。
- PWA。
- 移动端适配。
- 静态部署。

---

# 十九、MVP验收标准

| 编号 | 功能 | 验收标准 |
|---|---|---|
| 1 | 纯前端 | 不依赖后端 |
| 2 | 用户系统 | 无注册登录 |
| 3 | 卡牌数据 | 不存在预置知识卡牌 |
| 4 | Wikipedia API | 能实时搜索文章 |
| 5 | 动态生成 | 根据 API 数据生成卡牌 |
| 6 | 卡包 | 至少9种主题 |
| 7 | 每包卡牌 | 固定5张 |
| 8 | 卡牌去重 | 同包不重复 |
| 9 | 稀有度 | 五级稀有度 |
| 10 | 卡牌图片 | 获取原文图片或降级背景 |
| 11 | 摘要 | 展示 Wikipedia 摘要 |
| 12 | 收藏 | 自动保存本地 |
| 13 | 图鉴 | 展示已发现知识 |
| 14 | 重复卡牌 | 正确累计数量 |
| 15 | Wikipedia 跳转 | 正常打开原文 |
| 16 | 分享 | 单卡及整包海报 |
| 17 | 分享链接 | 可重新获取文章信息 |
| 18 | 本地存档 | 刷新不丢失 |
| 19 | 存档导入导出 | 正常恢复数据 |
| 20 | API 限流 | 有并发控制和错误处理 |
| 21 | 离线模式 | 可浏览已缓存卡牌 |
| 22 | 移动端 | 适配手机浏览器 |

---

# 二十、后续版本规划

## V1.1：知识探索增强

- 每日随机知识。
- 随机百科挑战。
- 今日历史知识。
- 随机冷知识卡包。
- 卡牌关联推荐。

---

# 二十一、关键产品决策

| 问题 | 最终方案 |
|---|---|
| 是否预置卡牌 | 否 |
| 是否预置知识数据 | 否 |
| 是否预置卡牌图片 | 否 |
| 卡牌从哪里来 | Wikipedia API |
| 卡牌何时生成 | 用户开启卡包时 |
| 每包多少张 | 固定5张 |
| 卡牌稀有度 | 本地随机分配 |
| 卡牌是否允许重复 | 允许 |
| 同包是否允许重复 | 不允许 |
| 卡牌如何保存 | IndexedDB |
| 分享如何实现 | Canvas + URL 参数 |
| 是否需要登录 | 不需要 |
| 是否需要后端 | 不需要 |
| 是否需要 AI API | 不需要 |
| 是否可以离线抽新卡 | 不可以 |

**最终产品定义：**

WikiCard 是一个以 Wikipedia 为实时知识数据源的纯前端知识盲盒游戏。

用户选择主题卡包后，网页直接调用 Wikipedia API 搜索相关百科文章，获取真实的文章摘要、图片和来源信息，动态生成5张不同的知识卡牌。

每张卡牌拥有独立的稀有度、知识内容和 Wikipedia 原文链接。

用户可以通过不断开启卡包探索全世界的知识，收集自己发现的百科条目，生成精美海报并分享。

项目不维护预置知识库，不需要后端服务器，不需要用户系统，所有收藏和游戏进度保存在浏览器本地。

**WikiCard：让整个 Wikipedia 都成为你的知识卡池。**