<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Search } from 'lucide-vue-next';
import type { CardPack } from '@/types';
import { listPacks, getPackQueries } from '@/services/pack/packConfig';
import { useGameStore } from '@/stores/gameStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { DAILY_FREE_PACKS } from '@/config/rarity';
import CardPackView from '@/components/CardPack.vue';

const router = useRouter();
const game = useGameStore();
const collection = useCollectionStore();
const packs = listPacks();

function open(p: CardPack) {
  router.push({ name: 'open', params: { packId: p.id } });
}

function ownedIn(p: CardPack) {
  return collection.owned.filter((c) => c.packId === p.id).length;
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black">卡包</h1>
        <p class="mt-1 text-sm text-muted">每个卡包对应一组 Wikipedia 搜索主题，开包时实时生成 5 张不重复的知识卡牌。</p>
      </div>
      <span class="chip text-sm">今日剩余 <b class="text-ink">{{ game.remainingFree }}</b> / {{ DAILY_FREE_PACKS }}</span>
    </div>

    <div class="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="p in packs" :key="p.id" class="flex flex-col gap-3">
        <CardPackView :pack="p" @select="open(p)" />
        <div class="px-1">
          <div class="flex flex-wrap gap-1">
            <span v-if="p.random" class="chip"><Search :size="10" />随机百科条目</span>
            <template v-else>
              <span v-for="q in getPackQueries(p, game.settings.language).slice(0, 4)" :key="q" class="chip">
                <Search :size="10" />{{ q }}
              </span>
            </template>
          </div>
          <p class="mt-2 text-xs text-muted">已收集 {{ ownedIn(p) }} 张</p>
        </div>
      </div>
    </div>
  </div>
</template>
