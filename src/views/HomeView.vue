<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Sparkles, Dices, Flame, ChevronRight, ExternalLink, Clock } from 'lucide-vue-next';
import type { CardPack, TrendingArticle } from '@/types';
import { RANDOM_PACK, THEME_PACKS, pickFeaturedPack } from '@/services/pack/packConfig';
import { getTrendingArticles } from '@/services/wikipedia/feed';
import { useGameStore } from '@/stores/gameStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { DAILY_FREE_PACKS } from '@/config/rarity';
import { formatDuration, msUntilTomorrow } from '@/utils/date';
import CardPackView from '@/components/CardPack.vue';
import CardGrid from '@/components/CardGrid.vue';
import HorizontalScroller from '@/components/HorizontalScroller.vue';

const router = useRouter();
const game = useGameStore();
const collection = useCollectionStore();

const featured = ref<CardPack>(pickFeaturedPack());
const trending = ref<TrendingArticle[]>([]);
const trendingState = ref<'loading' | 'ok' | 'error'>('loading');
const countdown = ref(formatDuration(msUntilTomorrow()));
let timer: ReturnType<typeof setInterval> | undefined;

const canOpen = computed(() => game.remainingFree > 0 && game.online);

function open(pack: CardPack, auto = true) {
  router.push({ name: 'open', params: { packId: pack.id }, query: auto && canOpen.value ? { auto: '1' } : {} });
}

async function loadTrending() {
  if (!game.online) {
    trendingState.value = 'error';
    return;
  }
  trendingState.value = 'loading';
  try {
    trending.value = await getTrendingArticles(game.settings.language, 8);
    trendingState.value = trending.value.length ? 'ok' : 'error';
  } catch {
    trendingState.value = 'error';
  }
}

onMounted(() => {
  timer = setInterval(() => (countdown.value = formatDuration(msUntilTomorrow())), 1000);
  // 热门推荐延迟加载，不阻塞首屏
  setTimeout(loadTrending, 300);
});
onBeforeUnmount(() => timer && clearInterval(timer));
</script>

<template>
  <div class="space-y-12">
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-panel via-bg to-panel px-6 py-12 text-center sm:py-16">
      <div class="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rare/20 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-mythic/15 blur-3xl" />
      <p class="relative text-xs font-bold tracking-[0.5em] text-muted sm:text-sm">DISCOVER KNOWLEDGE</p>
      <h1 class="relative mt-3 text-3xl font-black sm:text-5xl">
        打开一包，<span class="gradient-text">发现一个世界</span>
      </h1>
      <p class="relative mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base">
        每一张卡牌都实时来自 Wikipedia。选择一个主题卡包，探索 5 条真实的百科知识。
      </p>
      <div class="relative mt-8 flex flex-col items-center gap-3">
        <button class="btn-primary px-8 py-3.5 text-base" :disabled="!canOpen" @click="open(featured)">
          <Sparkles :size="18" />开启今日免费卡包
        </button>
        <p class="text-sm text-muted">
          今日主题：<span class="font-semibold text-ink">{{ featured.name }}</span>
        </p>
        <div class="flex items-baseline gap-1">
          <span class="text-3xl font-black text-ink">{{ game.remainingFree }}</span>
          <span class="text-lg text-muted">/ {{ DAILY_FREE_PACKS }}</span>
        </div>
        <p v-if="game.remainingFree === 0" class="flex items-center gap-1 text-xs text-muted">
          <Clock :size="12" />今日次数已用完，{{ countdown }} 后重置
        </p>
        <p v-else-if="!game.online" class="text-xs text-amber-200">离线状态下无法开启新卡包</p>
      </div>
    </section>

    <!-- 主题卡包 -->
    <section>
      <div class="flex items-center justify-between">
        <h2 class="section-title">主题卡包</h2>
        <RouterLink to="/packs" class="flex items-center text-sm text-muted hover:text-ink">全部<ChevronRight :size="16" /></RouterLink>
      </div>
      <HorizontalScroller>
        <div v-for="p in THEME_PACKS" :key="p.id" class="w-40 shrink-0 sm:w-48">
          <CardPackView :pack="p" @select="open(p, false)" />
        </div>
      </HorizontalScroller>
    </section>

    <!-- 随机盲盒 -->
    <section class="panel flex flex-col items-center gap-6 p-6 sm:flex-row sm:p-8">
      <div class="w-36 shrink-0 sm:w-44">
        <CardPackView :pack="RANDOM_PACK" floating :show-info="false" @select="open(RANDOM_PACK, false)" />
      </div>
      <div class="text-center sm:text-left">
        <h2 class="text-2xl font-black">随机盲盒</h2>
        <p class="mt-2 text-muted">今天会发现什么知识？从整个 Wikipedia 中随机抽取 5 个意想不到的条目。</p>
        <button class="btn-primary mt-5" :disabled="!canOpen" @click="open(RANDOM_PACK)"><Dices :size="18" />随机开启</button>
      </div>
    </section>

    <!-- 最近获得 -->
    <section>
      <div class="flex items-center justify-between">
        <h2 class="section-title">最近获得</h2>
        <RouterLink to="/codex" class="flex items-center text-sm text-muted hover:text-ink">图鉴<ChevronRight :size="16" /></RouterLink>
      </div>
      <CardGrid v-if="collection.recent.length" :cards="collection.recent.slice(0, 6)" />
      <div v-else class="panel p-8 text-center text-muted">还没有卡牌，开启第一个卡包吧！</div>
    </section>

    <!-- 我的收藏 -->
    <section class="panel grid grid-cols-2 gap-4 p-6 text-center sm:grid-cols-4">
      <RouterLink to="/collection" class="col-span-2 sm:col-span-4">
        <h2 class="text-lg font-bold">我的收藏</h2>
        <p class="mt-1 text-muted">
          已发现 <span class="text-2xl font-black text-ink">{{ collection.stats.discovered }}</span> 个知识
        </p>
      </RouterLink>
      <div>
        <p class="text-xl font-black">{{ game.stats.totalOpens }}</p>
        <p class="text-xs text-muted">开启卡包</p>
      </div>
      <div>
        <p class="text-xl font-black">{{ collection.stats.categories }}</p>
        <p class="text-xs text-muted">探索领域</p>
      </div>
      <div>
        <p class="text-xl font-black text-legendary">{{ collection.stats.byRarity.legendary + collection.stats.byRarity.mythic }}</p>
        <p class="text-xs text-muted">传说及以上</p>
      </div>
      <div>
        <p class="text-xl font-black">{{ collection.stats.duplicates }}</p>
        <p class="text-xs text-muted">重复获得</p>
      </div>
    </section>

    <!-- 热门知识推荐 -->
    <section>
      <h2 class="section-title"><Flame :size="18" class="text-orange-400" />热门知识推荐</h2>
      <p class="-mt-2 mb-4 text-xs text-muted">来自 Wikipedia 实时热门条目</p>
      <div v-if="trendingState === 'loading'" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="skeleton h-24 rounded-2xl" />
      </div>
      <div v-else-if="trendingState === 'ok'" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a
          v-for="a in trending"
          :key="a.title"
          :href="a.wikiUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="panel group flex gap-3 p-3 transition hover:border-white/15"
        >
          <img
            v-if="a.thumbnailUrl"
            :src="a.thumbnailUrl"
            :alt="a.title"
            loading="lazy"
            class="h-16 w-16 shrink-0 rounded-xl object-cover"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
          />
          <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 font-serif text-2xl font-black text-muted">
            {{ a.title.slice(0, 1) }}
          </div>
          <div class="min-w-0">
            <p class="flex items-center gap-1 truncate font-semibold group-hover:text-rare">
              {{ a.title }}<ExternalLink :size="12" class="shrink-0 opacity-50" />
            </p>
            <p class="line-clamp-2 text-xs text-muted">{{ a.description || a.extract }}</p>
            <p v-if="a.views" class="mt-1 text-[11px] text-muted/70">{{ a.views.toLocaleString() }} 次浏览</p>
          </div>
        </a>
      </div>
      <div v-else class="panel flex items-center justify-between p-4 text-sm text-muted">
        <span>{{ game.online ? '热门推荐暂时无法加载' : '离线状态下无法获取热门推荐' }}</span>
        <button v-if="game.online" class="btn-ghost" @click="loadTrending">重试</button>
      </div>
    </section>
  </div>
</template>
