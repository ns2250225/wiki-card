<script setup lang="ts">
import type { WikiCard } from '@/types';
import WikiCardView from './WikiCard.vue';
import CardBack from './CardBack.vue';
import RarityEffect from './RarityEffect.vue';

withDefaults(
  defineProps<{
    card: WikiCard;
    flipped: boolean;
    isNew?: boolean;
    count?: number;
    instant?: boolean;
    /** 翻开前在背面提示高稀有度 */
    hint?: boolean;
    effects?: boolean;
  }>(),
  { isNew: false, count: 0, instant: false, hint: true, effects: true },
);
const emit = defineEmits<{ (e: 'flip'): void; (e: 'select', card: WikiCard): void }>();
</script>

<template>
  <div
    class="flip"
    :class="{ flipped, instant }"
    role="button"
    :aria-label="flipped ? card.title : '点击翻开卡牌'"
    @click="flipped ? emit('select', card) : emit('flip')"
  >
    <div class="flip-inner">
      <div class="flip-face flip-back">
        <CardBack :hint="hint ? card.rarity : null" />
      </div>
      <div class="flip-face flip-front">
        <WikiCardView :card="card" :is-new="isNew" :count="count" :interactive="flipped" eager />
      </div>
    </div>
    <RarityEffect v-if="effects" :rarity="card.rarity" :active="flipped" />
  </div>
</template>
