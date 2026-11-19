<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { RotateCcw, ExternalLink, Sparkles, Eye, AlertTriangle } from 'lucide-vue-next';
import type { WikiCard } from '@/types';
import { getPackConfig } from '@/config/packs';
import { parseShareQuery, restoreSharedCards, wikiUrlForRef, type RestoredCard } from '@/services/share/shareUrl';
import { rememberSeenCards } from '@/services/collection/collectionService';
import { useCollectionStore } from '@/stores/collectionStore';
import { useGameStore } from '@/stores/gameStore';
import { sfx } from '@/utils/sound';
import CardFlip from '@/components/CardFlip.vue';

const route = useRoute();
const router = useRouter();
const collection = useCollectionStore();
const game = useGameStore();

const parsed = computed(() => parseShareQuery(route.query));
const pack = computed(() => (parsed.value.packId ? getPackConfig(parsed.value.packId) : undefined));
const items = ref<RestoredCard[]>([]);
const loading = ref(false);
const flipped = ref<boolean[]>([]);

const failed = computed(() => items.value.filter((i) => !i.card));
const loaded = computed(() => items.value.filter((i) => i.card));

async function load() {
  if (!parsed.value.refs.length) return;
  loading.value = true;
  items.value = [];
  try {
    items.value = await restoreSharedCards(parsed.value.refs);
  } finally {
    loading.value = false;
  }
  flipped.value = items.value.map(() => !game.animationsOn);
  // 见过的知识进入图鉴"未收集"
  const seen = items.value.map((i) => i.card).filter((c): c is WikiCard => !!c && !i_owned(c.id));
  if (seen.length) {
    await rememberSeenCards(seen).catch(() => undefined);
    void collection.refresh();
  }
  if (game.animationsOn) {
    for (let i = 0; i < items.value.length; i++) {
      await new Promise((r) => setTimeout(r, 450));
      if (items.value[i]?.card) {
        flipped.value[i] = true;
        sfx.flip(items.value[i].card!.rarity);
      }
    }
  }
}

function i_owned(id: string) {
  return (collection.byId.get(id)?.count ?? 0) > 0;
}

async function retryFailed() {
  const refs = failed.value.map((f) => f.ref);
  loading.value = true;
  try {
    const again = await restoreSharedCards(refs);
    const map = new Map(again.map((a) => [a.ref.id, a]));
    items.value = items.value.map((it) => map.get(it.ref.id) ?? it);
    items.value.forEach((it, i) => {
      if (it.card) flipped.value[i] = true;
    });
  } finally {
    loading.value = false;
  }
}

function select(card: WikiCard) {
  if (collection.byId.has(card.id)) router.push({ name: 'card', params: { id: card.id } });
  else window.open(card.wikiUrl, '_blank', 'noopener');
}

watch(() => route.query.cards, load);
onMounted(async () => {
  await collection.load();
  await load();
});
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <p class="text-xs font-bold tracking-[0.4em] text-muted">SHARED KNOWLEDGE</p>
      <h1 class="mt-2 text-2xl font-black sm:text-3xl">
        {{ pack ? `「${pack.name}」开包分享` : '知识卡牌分享' }}
      </h1>
      <p class="mt-2 text-sm text-muted">卡牌内容由当前浏览器实时从 Wikipedia 重新获取，不依赖分享者的存档。</p>
    </div>

    <div v-if="!parsed.refs.length" class="panel mx-auto max-w-md p-10 text-center">
      <AlertTriangle class="mx-auto text-amber-300" :size="36" />
      <p class="mt-3 font-bold">分享链接无效</p>
      <p class="mt-1 text-sm text-muted">链接中没有可识别的卡牌 ID（格式如 zh:12345）。</p>
      <RouterLink to="/" class="btn-primary mt-5">返回首页</RouterLink>
    </div>

    <template v-else>
      <div class="flex flex-wrap justify-center gap-4">
        <template v-if="loading && !items.length">
          <div v-for="r in parsed.refs" :key="r.id" class="w-[clamp(120px,40vw,200px)]">
            <div class="skeleton aspect-[3/4] rounded-2xl" />
          </div>
        </template>
        <div v-for="(it, i) in items" :key="it.ref.id" class="w-[clamp(120px,40vw,200px)]">
          <CardFlip
            v-if="it.card"
            :card="it.card"
            :flipped="flipped[i]"
            :instant="!game.animationsOn"
            :effects="game.animationsOn"
            @flip="flipped[i] = true"
            @select="select"
          />
          <div v-else class="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-white/10 bg-panel p-4 text-center">
            <AlertTriangle class="text-amber-300" :size="28" />
            <p class="mt-2 text-sm font-semibold">加载失败</p>
            <p class="mt-1 line-clamp-2 text-xs text-muted">{{ it.error }}</p>
            <a :href="wikiUrlForRef(it.ref)" target="_blank" rel="noopener noreferrer" class="mt-3 flex items-center gap-1 text-xs text-rare underline">
              <ExternalLink :size="12" />Wikipedia 原文
            </a>
          </div>
          <p v-if="it.fromCache" class="mt-1 text-center text-[11px] text-muted">离线缓存</p>
        </div>
      </div>

      <div class="mt-10 flex flex-wrap justify-center gap-3">
        <button v-if="failed.length" class="btn-ghost" :disabled="loading" @click="retryFailed"><RotateCcw :size="16" />重试加载（{{ failed.length }}）</button>
        <button v-if="flipped.some((f) => !f) && loaded.length" class="btn-ghost" @click="flipped = flipped.map(() => true)"><Eye :size="16" />全部翻开</button>
        <RouterLink :to="pack ? { name: 'open', params: { packId: pack.id } } : '/packs'" class="btn-primary">
          <Sparkles :size="16" />我也来开一包
        </RouterLink>
      </div>
      <p class="mt-4 text-center text-xs text-muted">点击已翻开的卡牌可查看详情或 Wikipedia 原文</p>
    </template>
  </div>
</template>
