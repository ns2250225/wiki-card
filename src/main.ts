import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/global.css';
import './styles/cards.css';
import './styles/animations.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// PWA：静态资源离线缓存
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => undefined);
}
