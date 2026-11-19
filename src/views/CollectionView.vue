<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Search, X } from 'lucide-vue-next';
import type { OwnedCard, Rarity } from '@/types';
import { RARITIES, rarityRank } from '@/config/rarity';
import { useCollectionStore } from '@/stores/collectionStore';
import { useGameStore } from '@/stores/gameStore';
import CardGrid from '@/components/CardGrid.vue';

type Tab = 'all' | 'owned' | 'unowned';
type Sort = 'recent' | 'oldest' | 'rarity' | 'count' | 'title';

const route = useRoute();
const router = useRouter();
const collection = useCollectionStore();
const game = useGameStore();

const tab = ref<Tab>((route.query.tab as Tab) || 'owned');
const keyword = ref(String(route.query.q ?? ''));
const category = ref(String(route.query.category ?? ''));
const rarity = ref<Rarity | ''>((route.query.rarity as Rarity) || '');
const sort = ref<Sort>((route.query.sort as Sort) || 'recent');
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: '全部卡牌' },
  { id: 'owned', label: '已收集' },
  { id: 'unowned', label: '未收集' },
];
const PAGE = 60;
const limit = ref(PAGE);

onMounted(() => collection.load());

watch([tab, keyword, category, rarity, sort], () => {
  limit.value = PAGE;
  const q: Record<string, string> = {};
  if (tab.value !== 'owned') q.tab = tab.value;
  if (keyword.value) q.q = keyword.value;
  if (category.value) q.category = category.value;
  if (rarity.value) q.rarity = rarity.value;
  if (sort.value !== 'recent') q.sort = sort.value;
  router.replace({ query: q });
});

const tabCounts = computed(() => ({
  all: collection.cards.length,
  owned: collection.owned.length,
  unowned: collection.seenOnly.length,
}));

const filtered = computed<OwnedCard[]>(() => {
  let list = collection.cards;
  if (tab.value === 'owned') list = list.filter((c) => c.count > 0);
  else if (tab.value === 'unowned') list = list.filter((c) => c.count === 0);
  if (category.value) list = list.filter((c) => c.category === category.value);
  if (rarity.value) list = list.filter((c) => c.rarity === rarity.value);
  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    list = list.filter((c) =>
      [c.title, c.englishTitle, c.description, c.extract].some((t) => t?.toLowerCase().includes(kw)),
    );
  }
  const sorted = [...list];
  switch (sort.value) {
    case 'recent':
      sorted.sort((a, b) => (b.lastObtainedAt || b.createdAt) - (a.lastObtainedAt || a.createdAt));
      break;
    case 'oldest':
      sorted.sort((a, b) => (a.firstObtainedAt || a.createdAt) - (b.firstObtainedAt || b.createdAt));
      break;
    case 'rarity':
      sorted.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.lastObtainedAt - a.lastObtainedAt);
      break;
    case 'count':
      sorted.sort((a, b) => b.count - a.count);
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      break;
  }
  return sorted;
});
const visible = computed(() => filtered.value.slice(0, limit.value));

function clearFilters() {
  keyword.value = '';
  category.value = '';
  rarity.value = '';
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-black">图鉴</h1>
      <p class="mt-1 text-sm text-muted">你发现的每一条 Wikipedia 知识都会收录在这里。</p>
    </div>

    <!-- 动态统计 -->
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div class="panel p-4">
        <p class="text-xs text-muted">累计发现知识</p>
        <p class="mt-1 text-2xl font-black">{{ collection.stats.discovered }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">累计开启卡包</p>
        <p class="mt-1 text-2xl font-black">{{ game.stats.totalOpens }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">已探索知识领域</p>
        <p class="mt-1 text-2xl font-black">{{ collection.stats.categories }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">重复获得</p>
        <p class="mt-1 text-2xl font-black">{{ collection.stats.duplicates }}</p>
      </div>
      <div class="panel col-span-2 p-4 sm:col-span-1">
        <p class="mb-1 text-xs text-muted">各稀有度</p>
        <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-bold">
          <span v-for="r in RARITIES" :key="r.id" :style="{ color: r.color }">{{ r.name }} {{ collection.stats.byRarity[r.id] }}</span>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="panel mb-6 space-y-3 p-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in TABS"
          :key="t.id"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
          :class="tab === t.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'"
          @click="tab = t.id"
        >
          {{ t.label }} <span class="text-xs opacity-60">{{ tabCounts[t.id] }}</span>
        </button>
      </div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label class="relative">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input v-model="keyword" class="input pl-9" placeholder="搜索卡牌标题或内容" type="search" />
        </label>
        <select v-model="category" class="input sm:w-36" aria-label="按分类">
          <option value="">全部分类</option>
          <option v-for="c in collection.categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="rarity" class="input sm:w-32" aria-label="按稀有度">
          <option value="">全部稀有度</option>
          <option v-for="r in RARITIES" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <select v-model="sort" class="input sm:w-36" aria-label="排序">
          <option value="recent">最近获得</option>
          <option value="oldest">最早获得</option>
          <option value="rarity">稀有度</option>
          <option value="count">拥有数量</option>
          <option value="title">标题</option>
        </select>
      </div>
    </div>

    <p v-if="tab === 'unowned'" class="mb-4 text-xs text-muted">
      「未收集」是你在分享页面中见过、但尚未亲自抽到的知识。WikiCard 不预置卡池，无需列出所有 Wikipedia 文章。
    </p>

    <div v-if="collection.loading && !collection.loaded" class="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      <div v-for="i in 6" :key="i" class="skeleton aspect-[3/4] rounded-2xl" />
    </div>
    <template v-else-if="filtered.length">
      <p class="mb-3 text-xs text-muted">共 {{ filtered.length }} 张</p>
      <CardGrid :cards="visible" />
      <div v-if="filtered.length > limit" class="mt-6 text-center">
        <button class="btn-ghost" @click="limit += PAGE">加载更多</button>
      </div>
    </template>
    <div v-else class="panel p-10 text-center">
      <p class="text-muted">{{ collection.cards.length ? '没有符合条件的卡牌' : '图鉴还是空的，去开启第一个卡包吧！' }}</p>
      <div class="mt-4 flex justify-center gap-2">
        <button v-if="keyword || category || rarity" class="btn-ghost" @click="clearFilters"><X :size="16" />清除筛选</button>
        <RouterLink to="/packs" class="btn-primary">去开包</RouterLink>
      </div>
    </div>
  </div>
</template>
