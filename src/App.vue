<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { Home, Package, BookOpen, Library, Settings, WifiOff } from 'lucide-vue-next';
import { useGameStore } from '@/stores/gameStore';
import { useCollectionStore } from '@/stores/collectionStore';

const game = useGameStore();
const collection = useCollectionStore();
const route = useRoute();

onMounted(async () => {
  await game.init();
  await collection.load();
});

const NAV = [
  { to: '/', name: 'home', label: '首页', icon: Home },
  { to: '/packs', name: 'packs', label: '卡包', icon: Package },
  { to: '/codex', name: 'codex', label: '图鉴', icon: BookOpen },
  { to: '/collection', name: 'collection', label: '收藏', icon: Library },
  { to: '/settings', name: 'settings', label: '设置', icon: Settings },
];

function isActive(name: string) {
  if (name === 'home') return route.name === 'home';
  if (name === 'packs') return route.name === 'packs' || route.name === 'open';
  if (name === 'codex') return route.name === 'codex' || route.name === 'card';
  return route.name === name;
}

const logoUrl = `${import.meta.env.BASE_URL}icons/icon.svg`;
const appClass = computed(() => ({ 'no-anim': !game.animationsOn }));
</script>

<template>
  <div class="min-h-screen" :class="appClass">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-30 border-b border-white/5 bg-bg/80 backdrop-blur-md">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <RouterLink to="/" class="flex items-center gap-2" aria-label="WikiCard 首页">
          <img :src="logoUrl" alt="" class="h-8 w-8" />
          <span class="font-serif text-lg font-extrabold tracking-[0.2em] gradient-text">WIKICARD</span>
        </RouterLink>
        <nav class="hidden items-center gap-1 md:flex" aria-label="主导航">
          <RouterLink
            v-for="item in NAV"
            :key="item.name"
            :to="item.to"
            :data-nav="item.name"
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition"
            :class="isActive(item.name) ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'"
          >
            <component :is="item.icon" :size="16" />{{ item.label }}
          </RouterLink>
        </nav>
        <div class="flex items-center gap-2 md:hidden">
          <span class="chip">今日 {{ game.remainingFree }}/3</span>
        </div>
      </div>
      <div v-if="!game.online" class="flex items-center justify-center gap-2 bg-amber-500/15 py-1.5 text-xs text-amber-200">
        <WifiOff :size="14" />离线模式：可以浏览已缓存的卡牌和收藏，暂时无法开启新卡包
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-12">
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="r.name === 'card' ? r.fullPath : (r.name as string)" />
        </Transition>
      </RouterView>
    </main>

    <!-- 移动端底部导航 -->
    <nav class="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-bg/90 backdrop-blur-md md:hidden" aria-label="底部导航">
      <div class="grid grid-cols-5">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          :to="item.to"
          :data-nav="item.name"
          class="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
          :class="isActive(item.name) ? 'text-ink' : 'text-muted'"
        >
          <component :is="item.icon" :size="20" :class="isActive(item.name) ? 'text-epic' : ''" />{{ item.label }}
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
