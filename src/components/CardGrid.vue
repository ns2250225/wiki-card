<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { OwnedCard, WikiCard } from '@/types';
import WikiCardView from './WikiCard.vue';

const props = withDefaults(
  defineProps<{
    cards: (WikiCard | OwnedCard)[];
    showCount?: boolean;
    newFlags?: boolean[];
    compact?: boolean;
    navigate?: boolean;
  }>(),
  { showCount: true, compact: false, navigate: true },
);
const emit = defineEmits<{ (e: 'select', card: WikiCard): void }>();
const router = useRouter();

function countOf(c: WikiCard | OwnedCard): number {
  return 'count' in c ? c.count : 0;
}

function select(card: WikiCard) {
  emit('select', card);
  if (props.navigate) router.push({ name: 'card', params: { id: card.id } });
}
</script>

<template>
  <div
    class="grid gap-3 sm:gap-4"
    :class="
      compact
        ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    "
  >
    <div v-for="(card, i) in cards" :key="card.id" class="anim-fade-up" :style="{ animationDelay: `${Math.min(i, 12) * 30}ms` }">
      <WikiCardView
        :card="card"
        :count="showCount ? countOf(card) : 0"
        :is-new="newFlags?.[i] ?? false"
        :unowned="'count' in card && card.count === 0"
        interactive
        @select="select"
      />
    </div>
  </div>
</template>
