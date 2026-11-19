<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { WikiCard } from '@/types';
import { RARITY_MAP } from '@/config/rarity';
import { themeBackground } from '@/utils/image';

const props = withDefaults(
  defineProps<{
    card: WikiCard;
    count?: number;
    isNew?: boolean;
    interactive?: boolean;
    tilt?: boolean;
    unowned?: boolean;
    eager?: boolean;
  }>(),
  { count: 0, isNew: false, interactive: false, tilt: false, unowned: false, eager: false },
);
const emit = defineEmits<{ (e: 'select', card: WikiCard): void }>();

const rarity = computed(() => RARITY_MAP[props.card.rarity] ?? RARITY_MAP.common);
const fallback = computed(() => themeBackground(props.card.title, props.card.category));
const failed = ref(false);
watch(
  () => props.card.imageUrl,
  () => (failed.value = false),
);
const src = computed(() => (!failed.value && props.card.imageUrl ? props.card.imageUrl : fallback.value));

const el = ref<HTMLElement | null>(null);
const tilting = ref(false);
function onMove(e: PointerEvent) {
  if (!props.tilt || !el.value || e.pointerType === 'touch') return;
  const r = el.value.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  el.value.style.setProperty('--ry', `${(px - 0.5) * 16}deg`);
  el.value.style.setProperty('--rx', `${(0.5 - py) * 16}deg`);
  el.value.style.setProperty('--mx', `${px * 100}%`);
  el.value.style.setProperty('--my', `${py * 100}%`);
  tilting.value = true;
}
function onLeave() {
  if (!el.value) return;
  el.value.style.setProperty('--rx', '0deg');
  el.value.style.setProperty('--ry', '0deg');
  tilting.value = false;
}
</script>

<template>
  <div
    ref="el"
    class="wc-card"
    :class="[`r-${card.rarity}`, { interactive, tilt: tilt && tilting, unowned }]"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="`${rarity.name}卡牌：${card.title}`"
    @click="interactive && emit('select', card)"
    @keydown.enter="interactive && emit('select', card)"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <div class="wc-frame">
      <div class="wc-inner">
        <div class="wc-image">
          <img
            :src="src"
            :alt="card.title"
            :loading="eager ? 'eager' : 'lazy'"
            decoding="async"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            draggable="false"
            @error="failed = true"
          />
          <span class="wc-rarity">{{ rarity.label }}</span>
        </div>
        <div class="wc-body">
          <h3 class="wc-title">{{ card.title }}</h3>
          <p v-if="card.englishTitle && card.englishTitle !== card.title" class="wc-en">{{ card.englishTitle }}</p>
          <span class="wc-cat">{{ card.category }}</span>
          <p class="wc-desc">{{ card.description || card.extract }}</p>
        </div>
        <div class="wc-foot">
          WIKICARD
          <small>#{{ card.pageId }}</small>
        </div>
        <div v-if="card.rarity === 'mythic'" class="wc-holo" />
        <div v-else-if="card.rarity === 'legendary'" class="wc-shine" />
      </div>
    </div>
    <span v-if="isNew" class="wc-badge new">NEW</span>
    <span v-if="count > 1" class="wc-badge count">×{{ count }}</span>
  </div>
</template>
