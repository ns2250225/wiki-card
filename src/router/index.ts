import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

/**
 * 使用 Hash 路由，静态部署到 GitHub Pages / Cloudflare Pages 时无需服务端回退配置。
 * 分享链接格式：https://example.com/#/share?cards=zh:12345,en:67890
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: '首页' } },
    { path: '/packs', name: 'packs', component: () => import('@/views/PacksView.vue'), meta: { title: '卡包' } },
    {
      path: '/open/:packId',
      name: 'open',
      component: () => import('@/views/OpeningView.vue'),
      meta: { title: '开启卡包', immersive: true },
    },
    { path: '/card/:id', name: 'card', component: () => import('@/views/CardDetailView.vue'), meta: { title: '卡牌详情' } },
    { path: '/codex', name: 'codex', component: () => import('@/views/CollectionView.vue'), meta: { title: '图鉴' } },
    { path: '/collection', name: 'collection', component: () => import('@/views/HistoryView.vue'), meta: { title: '我的收藏' } },
    { path: '/share', name: 'share', component: () => import('@/views/ShareView.vue'), meta: { title: '分享' } },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '设置' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 };
  },
});

router.afterEach((to) => {
  const t = to.meta.title as string | undefined;
  document.title = t ? `${t} · WikiCard` : 'WikiCard · 打开一包，发现一个世界';
});

export default router;
