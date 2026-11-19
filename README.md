# WikiCard —— Wikipedia 知识盲盒

> Open a Pack, Discover a World. 打开一包，发现一个世界。

![Vue 3](https://img.shields.io/badge/Vue-3-42b883) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![PWA](https://img.shields.io/badge/PWA-ready-5a0fc8) ![License](https://img.shields.io/badge/内容许可-CC%20BY--SA%204.0-lightgrey)

纯前端知识卡牌收集游戏。每张卡牌都在开包时实时从 Wikipedia API 获取并动态生成，项目不预置任何卡牌、知识或图片。

## 在线体验

推送后由 GitHub Actions 自动部署：**https://ns2250225.github.io/wiki-card/**

## 技术栈

Vue 3 + TypeScript · Vite · Tailwind CSS · Pinia · Dexie.js (IndexedDB) · GSAP · Vue Router · Lucide · Canvas API · vite-plugin-pwa

## 开发与构建

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 生产构建，输出到 dist/
npm run preview    # 预览构建结果
```

默认使用相对路径 `base: './'` 和 Hash 路由，`dist/` 可直接部署到 GitHub Pages / Cloudflare Pages 任意路径，无需服务端回退配置。
如需固定子路径，可设置 `BASE_URL=/wikicard/ npm run build`。仓库内置 `.github/workflows/deploy.yml` 用于 GitHub Pages 自动部署。

## 功能概览

| 模块 | 说明 |
|---|---|
| 主题卡包 | 9 种卡包（宇宙、动物、植物、文明、科学、奇观、人物、神秘、随机盲盒），配置只保存搜索规则 |
| 动态生成 | REST Search → 随机打乱 → 去重过滤 → REST Summary → 图片补充（pageimages / Commons / 动态主题背景） |
| 稀有度 | 普通 55% / 稀有 25% / 史诗 13% / 传说 6% / 神话 1%；保底 20 / 50 / 100 张 |
| 去重 | 同包 `语言:pageId` 不重复；跨包可重复，重复卡牌沿用首次稀有度并累计数量 |
| 每日免费 | 每日 3 包，按本地日期重置；只有成功生成并保存 5 张卡后才扣次数 |
| 动画 | 卡包悬浮 / 震动 / 撕开 / 卡牌飞出 / 逐张翻转 / 稀有度特效 / 收入图鉴；可在设置中关闭 |
| 图鉴 | 全部 / 已收集 / 未收集，分类、稀有度筛选，排序和搜索，动态统计 |
| 卡牌详情 | 摘要、趣味知识、扩展知识点（按需请求完整 HTML）、章节、插图、多语言版本、来源与许可 |
| 分享 | Canvas 单卡海报 1080×1440、整包海报 1080×1920（含二维码），PNG 下载 / 系统分享 |
| 分享链接 | `#/share?cards=zh:12345,en:67890&r=clemr&pack=space`，打开后重新请求 Wikipedia 恢复卡牌 |
| 存档 | 自动保存；导出 `wikicard-save-YYYY-MM-DD.json`；导入时校验格式、版本、字段与 ID 并确认覆盖 |
| PWA / 离线 | 静态资源预缓存，Wikimedia 图片运行时缓存；离线可浏览收藏、历史并生成海报 |

## API 请求策略

- REST API：搜索、摘要、页面详情、HTML、语言链接、Feed（热门推荐）
- Action API（`origin=*`）：随机文章、Page ID → 标题、langlinks、pageimages、Commons imageinfo
- 并发上限 3、超时 12s、指数退避重试、遵循 `Retry-After`，429 后全局暂停
- 单次开包请求预算 45 次，关键词用尽或预算用尽即停止并提示
- IndexedDB 缓存：标题/ID 长期、摘要 7 天、详情 1 天、搜索 1 小时；网络失败时降级使用过期缓存
- 设置页提供「API 跨域连通性检测」，在真实浏览器中逐一验证各接口

## 目录

```
src/
├── components/   WikiCard, CardPack, PackArt, CardFlip, CardBack, PackOpening, RarityEffect, LoadingKnowledge, CardGrid, SharePoster
├── views/        Home, Packs, Opening, CardDetail, Collection(图鉴), History(收藏), Share, Settings
├── services/     wikipedia/ card/ pack/ collection/ share/
├── database/     db.ts, migrations.ts, saveManager.ts
├── stores/       gameStore, collectionStore, packStore, cardStore
├── config/       packs.ts, rarity.ts
├── utils/        random, cache, image, date, sound
└── styles/       global.css, cards.css, animations.css
```

## 许可说明

卡牌文字来自 Wikipedia（CC BY-SA 4.0），图片来自 Wikipedia / Wikimedia Commons，版权归原作者所有。稀有度由游戏随机分配，与条目实际重要性无关。
