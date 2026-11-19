<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, RotateCcw, Share2, BookOpen, Sparkles, WifiOff, Clock, Package } from 'lucide-vue-next';
import type { WikiCard } from '@/types';
import { getPackConfig } from '@/services/pack/packConfig';
import { usePackStore } from '@/stores/packStore';
import { useGameStore } from '@/stores/gameStore';
import { DAILY_FREE_PACKS, RARITY_MAP } from '@/config/rarity';
import { formatDuration, msUntilTomorrow } from '@/utils/date';
import { sfx } from '@/utils/sound';
import CardPackView from '@/components/CardPack.vue';
import LoadingKnowledge from '@/components/LoadingKnowledge.vue';
import PackOpening from '@/components/PackOpening.vue';
import CardGrid from '@/components/CardGrid.vue';
import SharePoster from '@/components/SharePoster.vue';

type View = 'prepare' | 'loading' | 'opening' | 'result' | 'error' | 'offline' | 'quota' | 'notfound';

const route = useRoute();
const router = useRouter();
const packStore = usePackStore();
const game = useGameStore();

const packId = computed(() => String(route.params.packId ?? ''));
const pack = computed(() => getPackConfig(packId.value));
const view = ref<View>('prepare');
const shareOpen = ref(false);
const countdown = ref(formatDuration(msUntilTomorrow()));
let timer: ReturnType<typeof setInterval> | undefined;

const result = computed(() => packStore.result);
const best = computed(() => (result.value ? RARITY_MAP[result.value.history.highestRarity] : null));

function init() {
  if (!pack.value) {
    view.value = 'notfound';
    return;
  }
  if (packStore.status === 'loading' && packStore.packId === packId.value) {
    view.value = 'loading';
    void waitForCurrent();
    return;
  }
  if (
    packStore.status === 'ready' &&
    packStore.packId === packId.value &&
    packStore.result &&
    packStore.viewedId !== packStore.result.history.id
  ) {
    showOpening();
    return;
  }
  packStore.reset();
  if (route.query.auto) {
    router.replace({ query: {} });
    void start();
  } else {
    view.value = precheck() ?? 'prepare';
  }
}

function precheck(): View | null {
  if (!game.online) return 'offline';
  if (game.remainingFree <= 0) return 'quota';
  return null;
}

async function waitForCurrent() {
  const stop = watch(
    () => packStore.status,
    (s) => {
      if (s === 'ready') {
        stop();
        showOpening();
      } else if (s === 'error') {
        stop();
        handleError();
      }
    },
  );
}

function showOpening() {
  if (!packStore.result) return;
  packStore.viewedId = packStore.result.history.id;
  view.value = 'opening';
}

function handleError() {
  if (packStore.errorKind === 'quota') view.value = 'quota';
  else if (packStore.errorKind === 'offline') view.value = 'offline';
  else view.value = 'error';
}

/** 开包：加载中不允许重复点击 */
async function start() {
  if (packStore.busy) return;
  const pre = precheck();
  if (pre) {
    view.value = pre;
    return;
  }
  sfx.click();
  view.value = 'loading';
  const res = await packStore.open(packId.value);
  // 用户可能已离开或切换到其他卡包
  if (route.name !== 'open' || route.params.packId !== packId.value) return;
  if (res) showOpening();
  else handleError();
}

function onDone() {
  view.value = 'result';
}

function openCard(card: WikiCard) {
  router.push({ name: 'card', params: { id: card.id } });
}

async function again() {
  packStore.reset();
  await start();
}

watch(packId, () => init());
onMounted(async () => {
  await game.init();
  init();
  timer = setInterval(() => (countdown.value = formatDuration(msUntilTomorrow())), 1000);
});
onBeforeUnmount(() => timer && clearInterval(timer));
</script>

<template>
  <div>
    <button class="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink" @click="router.push('/packs')">
      <ArrowLeft :size="16" />返回卡包
    </button>

    <!-- 卡包不存在 -->
    <div v-if="view === 'notfound'" class="panel p-10 text-center">
      <p class="text-lg font-bold">卡包不存在</p>
      <RouterLink to="/packs" class="btn-primary mt-4">查看全部卡包</RouterLink>
    </div>

    <!-- 准备 -->
    <div v-else-if="view === 'prepare' && pack" class="flex flex-col items-center py-6 text-center">
      <div class="w-[min(64vw,280px)]">
        <CardPackView :pack="pack" floating :interactive="false" />
      </div>
      <p class="mt-6 max-w-md text-sm text-muted">{{ pack.description }} · 实时从 Wikipedia 获取 5 张知识卡牌</p>
      <button class="btn-primary mt-6 px-10 py-3.5 text-base" :disabled="packStore.busy" @click="start">
        <Sparkles :size="18" />开启卡包
      </button>
      <p class="mt-3 text-sm text-muted">今日剩余免费次数 {{ game.remainingFree }} / {{ DAILY_FREE_PACKS }}</p>
    </div>

    <!-- 加载 -->
    <div v-else-if="view === 'loading'">
      <LoadingKnowledge
        :message="packStore.progress.message"
        :found="packStore.progress.found"
        :total="packStore.progress.total"
        :animated="game.animationsOn"
      />
    </div>

    <!-- 开包动画 -->
    <div v-else-if="view === 'opening' && pack && result">
      <PackOpening :pack="pack" :result="result" :animated="game.animationsOn" @done="onDone" @select="openCard" />
    </div>

    <!-- 结果 -->
    <div v-else-if="view === 'result' && pack && result" class="anim-fade-up">
      <div class="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p class="text-sm text-muted">{{ pack.name }} · 开包结果</p>
          <p class="mt-1 text-xl font-black">
            最高稀有度
            <span :style="{ color: best?.color }">{{ best?.name }} {{ best?.label }}</span>
          </p>
          <p class="mt-1 text-sm text-muted">
            新获得 <b class="text-ink">{{ result.history.newCardCount }}</b> 张 · 重复
            <b class="text-ink">{{ result.history.duplicateCount }}</b> 张 · 已自动保存到本地收藏
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-ghost" @click="shareOpen = true"><Share2 :size="16" />分享整包</button>
          <RouterLink to="/codex" class="btn-ghost"><BookOpen :size="16" />查看图鉴</RouterLink>
          <button class="btn-primary" :disabled="game.remainingFree <= 0 || !game.online || packStore.busy" @click="again">
            <RotateCcw :size="16" />再开一包（剩余 {{ game.remainingFree }}）
          </button>
        </div>
      </div>
      <CardGrid :cards="result.cards" :new-flags="result.newFlags" :show-count="false" />
      <SharePoster
        :open="shareOpen"
        mode="pack"
        :cards="result.cards"
        :pack-id="pack.id"
        :new-count="result.history.newCardCount"
        @close="shareOpen = false"
      />
    </div>

    <!-- 离线 -->
    <div v-else-if="view === 'offline'" class="panel mx-auto max-w-lg p-10 text-center">
      <WifiOff class="mx-auto text-amber-300" :size="40" />
      <p class="mt-4 text-lg font-bold">离线模式</p>
      <p class="mt-2 text-sm text-muted">
        知识卡牌来自实时 Wikipedia API，离线时无法发现全新的知识。你仍然可以浏览已缓存的卡牌、收藏与历史抽卡记录，并生成分享海报。
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <RouterLink to="/codex" class="btn-ghost">浏览图鉴</RouterLink>
        <button class="btn-primary" :disabled="!game.online" @click="init">{{ game.online ? '重新尝试' : '等待网络恢复' }}</button>
      </div>
    </div>

    <!-- 次数用完 -->
    <div v-else-if="view === 'quota'" class="panel mx-auto max-w-lg p-10 text-center">
      <Clock class="mx-auto text-muted" :size="40" />
      <p class="mt-4 text-lg font-bold">今日免费卡包已用完</p>
      <p class="mt-2 text-sm text-muted">每天 {{ DAILY_FREE_PACKS }} 包，按本地日期重置。距离重置还有</p>
      <p class="mt-2 font-mono text-3xl font-black">{{ countdown }}</p>
      <div class="mt-6 flex justify-center gap-2">
        <RouterLink to="/codex" class="btn-ghost"><BookOpen :size="16" />去看看图鉴</RouterLink>
        <RouterLink to="/collection" class="btn-ghost"><Package :size="16" />我的收藏</RouterLink>
      </div>
    </div>

    <!-- 错误 -->
    <div v-else-if="view === 'error'" class="panel mx-auto max-w-lg p-10 text-center">
      <p class="text-lg font-bold">开包失败</p>
      <p class="mt-2 text-sm text-muted">{{ packStore.error }}</p>
      <p class="mt-1 text-xs text-muted/80">
        {{
          packStore.errorKind === 'ratelimit'
            ? 'Wikipedia 正在限流，已暂停请求，请稍后重试。'
            : '本次未消耗免费次数，已获取的数据已缓存，重试时会复用。'
        }}
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <RouterLink to="/packs" class="btn-ghost">换一个卡包</RouterLink>
        <button class="btn-primary" :disabled="packStore.busy" @click="again"><RotateCcw :size="16" />重试</button>
      </div>
    </div>
  </div>
</template>
