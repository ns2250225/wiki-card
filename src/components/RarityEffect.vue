<script setup lang="ts">
import { computed } from 'vue';
import type { Rarity } from '@/types';
import { RARITY_MAP } from '@/config/rarity';

const props = defineProps<{ rarity: Rarity; active: boolean }>();

const COLORS: Record<Rarity, string[]> = {
  common: [],
  rare: ['#8cc0ff', '#398BFF'],
  epic: ['#d6b0ff', '#A45CFF', '#7b2ff0'],
  legendary: ['#fff3c4', '#FFC247', '#ffe08a'],
  mythic: ['#FF5DB7', '#FFC247', '#5CFFB0', '#33D6E0', '#398BFF', '#A45CFF'],
};
const COUNT: Record<Rarity, number> = { common: 0, rare: 6, epic: 16, legendary: 22, mythic: 34 };

const particles = computed(() => {
  const colors = COLORS[props.rarity];
  return Array.from({ length: COUNT[props.rarity] }, (_, i) => ({
    left: `${(i * 61) % 100}%`,
    bottom: `${(i * 17) % 40}%`,
    size: `${4 + ((i * 7) % 6)}px`,
    color: colors[i % colors.length],
    delay: `${((i * 0.13) % 1.6).toFixed(2)}s`,
    duration: `${(1.6 + ((i * 0.29) % 1.4)).toFixed(2)}s`,
    dx: `${((i * 37) % 60) - 30}px`,
  }));
});
const color = computed(() => RARITY_MAP[props.rarity].color);
</script>

<template>
  <div v-if="active && rarity !== 'common'" class="rarity-effect" aria-hidden="true">
    <!-- 光柱：传说 / 神话 -->
    <div v-if="rarity === 'legendary' || rarity === 'mythic'" class="beam" :class="rarity" />
    <!-- 爆发光环 -->
    <div class="ring" :style="{ borderColor: color }" />
    <div v-if="rarity === 'mythic'" class="ring ring2" />
    <!-- 粒子 -->
    <span
      v-for="(p, i) in particles"
      :key="i"
      class="particle"
      :class="{ star: rarity === 'mythic' && i % 3 === 0 }"
      :style="{
        left: p.left,
        bottom: p.bottom,
        width: p.size,
        height: p.size,
        background: p.color,
        boxShadow: `0 0 10px ${p.color}`,
        animationDelay: p.delay,
        animationDuration: p.duration,
        '--dx': p.dx,
      }"
    />
  </div>
</template>

<style scoped>
.rarity-effect {
  position: absolute;
  inset: -12%;
  pointer-events: none;
  z-index: 10;
}
.particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0;
  animation: particle-rise 2s ease-out infinite;
}
.particle.star {
  border-radius: 2px;
  transform: rotate(45deg);
}
.beam {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 70%;
  height: 160%;
  transform-origin: bottom;
  z-index: -1;
  animation: beam 1.6s ease-out forwards;
  filter: blur(8px);
}
.beam.legendary {
  background: linear-gradient(0deg, rgba(255, 194, 71, 0.75), rgba(255, 236, 170, 0.3) 60%, transparent);
}
.beam.mythic {
  background: linear-gradient(0deg, rgba(255, 93, 183, 0.7), rgba(57, 139, 255, 0.4) 50%, rgba(92, 255, 176, 0.2) 75%, transparent);
}
.ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 3px solid;
  animation: ring-burst 0.9s ease-out forwards;
}
.ring2 {
  border-color: #5cffb0;
  animation-delay: 0.25s;
  opacity: 0;
}
</style>
