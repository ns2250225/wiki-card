<script setup lang="ts">
import type { Rarity } from '@/types';

defineProps<{ hint?: Rarity | null }>();

const stars = Array.from({ length: 9 }, (_, i) => ({
  left: `${8 + ((i * 37) % 84)}%`,
  top: `${6 + ((i * 53) % 88)}%`,
  delay: `${(i * 0.37) % 2.4}s`,
  scale: 0.5 + ((i * 13) % 10) / 12,
}));
</script>

<template>
  <div class="wc-back">
    <div class="wc-back-frame" :class="hint && ['epic', 'legendary', 'mythic'].includes(hint) ? `hint-${hint}` : ''">
    <div class="wc-back-inner">
      <!-- 知识宇宙图案 + 几何纹理 -->
      <svg class="absolute inset-0 h-full w-full" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="wc-hex" width="28" height="48" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
            <path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z M14 32 L14 48" fill="none" stroke="rgba(164,92,255,0.12)" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="300" height="400" fill="url(#wc-hex)" />
        <g fill="none" stroke-width="1.2">
          <circle cx="150" cy="190" r="70" stroke="rgba(57,139,255,0.35)" />
          <circle cx="150" cy="190" r="105" stroke="rgba(164,92,255,0.25)" stroke-dasharray="4 6" />
          <circle cx="150" cy="190" r="140" stroke="rgba(255,93,183,0.18)" />
          <ellipse cx="150" cy="190" rx="130" ry="40" stroke="rgba(255,194,71,0.25)" transform="rotate(-25 150 190)" />
          <ellipse cx="150" cy="190" rx="130" ry="40" stroke="rgba(57,139,255,0.2)" transform="rotate(25 150 190)" />
        </g>
        <g fill="rgba(245,245,247,0.6)">
          <circle cx="52" cy="98" r="2.5" /><circle cx="250" cy="120" r="2" /><circle cx="80" cy="300" r="2" />
          <circle cx="232" cy="290" r="2.5" /><circle cx="150" cy="50" r="2" /><circle cx="150" cy="340" r="2" />
        </g>
        <g stroke="rgba(245,245,247,0.15)">
          <line x1="52" y1="98" x2="150" y2="50" /><line x1="150" y1="50" x2="250" y2="120" />
          <line x1="80" y1="300" x2="150" y2="340" /><line x1="150" y1="340" x2="232" y2="290" />
        </g>
        <rect x="14" y="14" width="272" height="372" rx="14" fill="none" stroke="rgba(245,245,247,0.12)" />
      </svg>
      <span
        v-for="(s, i) in stars"
        :key="i"
        class="wc-back-star"
        :style="{ left: s.left, top: s.top, animationDelay: s.delay, transform: `scale(${s.scale})` }"
      />
      <div class="wc-back-logo">
        <span class="w">W</span>
        <span class="t">WIKICARD</span>
      </div>
    </div>
    </div>
  </div>
</template>
