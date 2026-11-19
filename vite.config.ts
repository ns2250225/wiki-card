import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// 部署到 GitHub Pages 子路径时，可通过环境变量 BASE_URL=/wikicard/ 指定
const base = process.env.BASE_URL || './';

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // 使用 public/manifest.json，自行在 index.html 中引用
      manifest: false,
      includeAssets: ['icons/*.svg', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Wikimedia 图片：缓存已浏览过的卡牌图片，支持离线查看
            urlPattern: /^https:\/\/upload\.wikimedia\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wikimedia-images',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
