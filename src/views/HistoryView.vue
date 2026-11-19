<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ChevronDown, Share2, Repeat, Target } from 'lucide-vue-next';
import type { PackHistory, WikiCard } from '@/types';
import { PITY, RARITIES, RARITY_MAP } from '@/config/rarity';
import { CATEGORY_COLORS, getPackConfig } from '@/config/packs';
import { useCollectionStore } from '@/stores/collectionStore';
import { useGameStore } from '@/stores/gameStore';
import { formatDateTime, relativeTime } from '@/utils/date';
import CardGrid from '@/components/CardGrid.vue';
import SharePoster from '@/components/SharePoster.vue';

const collection = useCollectionStore();
const game = useGameStore();

onMounted(() => collection.load());

const expanded = ref<string | null>(null);
const historyLimit = ref(20);
const share = ref<{ record: PackHistory; cards: WikiCard[] } | null>(null);

const maxRarity = computed(() => Math.max(1, ...Object.values(collection.stats.byRarity)));
const categoryList = computed(() =>
  Object.entries(collection.stats.byCategory).sort((a, b) => b[1] - a[1]),
);
const maxCategory = computed(() => Math.max(1, ...categoryList.value.map(([, n]) => n)));
const duplicates = computed(() =>
  collection.owned
    .filter((c) => c.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12),
);
const pity = computed(() => [
  { label: '史诗保底', value: game.stats.epicPity, max: PITY.epic, color: RARITY_MAP.epic.color },
  { label: '传说保底', value: game.stats.legendaryPity, max: PITY.legendary, color: RARITY_MAP.legendary.color },
  { label: '神话保底', value: game.stats.mythicPity, max: PITY.mythic, color: RARITY_MAP.mythic.color },
]);

function cardsOf(record: PackHistory): WikiCard[] {
  return record.cardIds.map((id) => collection.byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
}

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id;
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-black">我的收藏</h1>
      <p class="mt-1 text-sm text-muted">所有数据都保存在当前浏览器中。可在设置中导出存档备份。</p>
    </div>

    <!-- 总览 -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="panel p-4">
        <p class="text-xs text-muted">累计发现知识</p>
        <p class="mt-1 text-3xl font-black gradient-text">{{ collection.stats.discovered }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">累计开启卡包</p>
        <p class="mt-1 text-3xl font-black">{{ game.stats.totalOpens }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">累计获得卡牌</p>
        <p class="mt-1 text-3xl font-black">{{ game.stats.totalCards }}</p>
      </div>
      <div class="panel p-4">
        <p class="text-xs text-muted">重复获得数量</p>
        <p class="mt-1 text-3xl font-black">{{ collection.stats.duplicates }}</p>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- 各稀有度 -->
      <div class="panel p-5">
        <h2 class="section-title text-base">各稀有度卡牌数量</h2>
        <div class="space-y-3">
          <div v-for="r in RARITIES" :key="r.id" class="flex items-center gap-3 text-sm">
            <span class="w-16 shrink-0 font-bold" :style="{ color: r.color }">{{ r.name }}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                class="h-full rounded-full"
                :style="{
                  width: `${(collection.stats.byRarity[r.id] / maxRarity) * 100}%`,
                  background: r.id === 'mythic' ? 'linear-gradient(90deg,#FF5DB7,#FFC247,#5CFFB0,#398BFF,#A45CFF)' : r.color,
                }"
              />
            </div>
            <span class="w-10 text-right font-mono">{{ collection.stats.byRarity[r.id] }}</span>
          </div>
        </div>
        <h3 class="mb-3 mt-6 flex items-center gap-1.5 text-sm font-bold text-muted"><Target :size="14" />保底进度</h3>
        <div class="space-y-2">
          <div v-for="p in pity" :key="p.label" class="flex items-center gap-3 text-xs">
            <span class="w-16 shrink-0 text-muted">{{ p.label }}</span>
            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div class="h-full rounded-full" :style="{ width: `${(p.value / p.max) * 100}%`, background: p.color }" />
            </div>
            <span class="w-14 text-right font-mono text-muted">{{ p.value }}/{{ p.max }}</span>
          </div>
        </div>
      </div>

      <!-- 知识领域 -->
      <div class="panel p-5">
        <h2 class="section-title text-base">已探索知识领域（{{ collection.stats.categories }}）</h2>
        <div v-if="categoryList.length" class="space-y-3">
          <div v-for="[name, n] in categoryList" :key="name" class="flex items-center gap-3 text-sm">
            <span class="w-16 shrink-0 truncate">{{ name }}</span>
            <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div class="h-full rounded-full" :style="{ width: `${(n / maxCategory) * 100}%`, background: CATEGORY_COLORS[name] ?? '#A45CFF' }" />
            </div>
            <span class="w-10 text-right font-mono">{{ n }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-muted">还没有探索任何领域</p>
      </div>
    </div>

    <!-- 重复卡牌 -->
    <div v-if="duplicates.length">
      <h2 class="section-title"><Repeat :size="18" />重复获得最多</h2>
      <CardGrid :cards="duplicates" compact />
    </div>

    <!-- 抽卡历史 -->
    <div>
      <h2 class="section-title">历史开包记录（{{ collection.history.length }}）</h2>
      <div v-if="!collection.history.length" class="panel p-8 text-center text-muted">暂无开包记录</div>
      <div v-else class="space-y-3">
        <div v-for="h in collection.history.slice(0, historyLimit)" :key="h.id" class="panel overflow-hidden">
          <button class="flex w-full items-center gap-3 p-4 text-left" :aria-expanded="expanded === h.id" @click="toggle(h.id)">
            <span class="h-10 w-1.5 shrink-0 rounded-full" :style="{ background: RARITY_MAP[h.highestRarity].color }" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ getPackConfig(h.packId)?.name ?? h.packId }}</p>
              <p class="text-xs text-muted" :title="formatDateTime(h.createdAt)">
                {{ relativeTime(h.createdAt) }} · 新 {{ h.newCardCount }} · 重复 {{ h.duplicateCount }}
              </p>
            </div>
            <span class="text-xs font-bold" :style="{ color: RARITY_MAP[h.highestRarity].color }">{{ RARITY_MAP[h.highestRarity].label }}</span>
            <ChevronDown :size="18" class="text-muted transition" :class="{ 'rotate-180': expanded === h.id }" />
          </button>
          <div v-if="expanded === h.id" class="border-t border-white/5 p-4">
            <CardGrid :cards="cardsOf(h)" :show-count="false" compact />
            <div class="mt-4 flex justify-end">
              <button class="btn-ghost" @click="share = { record: h, cards: cardsOf(h) }"><Share2 :size="16" />分享这包</button>
            </div>
          </div>
        </div>
        <div v-if="collection.history.length > historyLimit" class="text-center">
          <button class="btn-ghost" @click="historyLimit += 20">加载更多</button>
        </div>
      </div>
    </div>

    <SharePoster
      v-if="share"
      :open="!!share"
      mode="pack"
      :cards="share.cards"
      :pack-id="share.record.packId"
      :new-count="share.record.newCardCount"
      @close="share = null"
    />
  </div>
</template>
