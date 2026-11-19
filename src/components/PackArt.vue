<script setup lang="ts">
/**
 * 卡包封面：使用 SVG 动态绘制主题图案，不依赖任何预置知识图片。
 */
defineProps<{ theme: string; accent: string }>();
</script>

<template>
  <svg viewBox="0 0 200 200" class="h-full w-full" aria-hidden="true">
    <defs>
      <radialGradient :id="`pa-glow-${theme}`" cx="50%" cy="50%" r="50%">
        <stop offset="0" :stop-color="accent" stop-opacity="0.55" />
        <stop offset="1" :stop-color="accent" stop-opacity="0" />
      </radialGradient>
    </defs>
    <circle cx="100" cy="100" r="95" :fill="`url(#pa-glow-${theme})`" />

    <!-- 宇宙探索：星球、星空、轨道 -->
    <g v-if="theme === 'space'">
      <g fill="#fff">
        <circle cx="30" cy="40" r="1.5" /><circle cx="170" cy="30" r="2" /><circle cx="160" cy="160" r="1.5" />
        <circle cx="40" cy="150" r="2" /><circle cx="120" cy="20" r="1" /><circle cx="15" cy="100" r="1.2" />
        <circle cx="185" cy="100" r="1.4" />
      </g>
      <ellipse cx="100" cy="100" rx="86" ry="30" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-dasharray="3 5" transform="rotate(-20 100 100)" />
      <circle cx="100" cy="100" r="40" :fill="accent" />
      <circle cx="88" cy="88" r="40" fill="#fff" fill-opacity="0.18" />
      <path d="M70 92 Q100 82 130 96" stroke="#11131B" stroke-opacity="0.25" stroke-width="5" fill="none" />
      <path d="M68 110 Q100 120 132 106" stroke="#11131B" stroke-opacity="0.2" stroke-width="4" fill="none" />
      <ellipse cx="100" cy="100" rx="64" ry="14" fill="none" stroke="#FFC247" stroke-width="4" transform="rotate(-20 100 100)" />
      <circle cx="166" cy="70" r="8" fill="#FFC247" />
    </g>

    <!-- 神奇动物：动物剪影 -->
    <g v-else-if="theme === 'animals'" fill="#F5F5F7">
      <path d="M60 140 Q52 110 70 92 Q84 80 102 86 L118 70 L122 84 Q140 88 146 108 Q150 128 136 140 L128 140 L126 124 L104 124 L100 140 L90 140 L88 124 Q76 126 72 140 Z" :fill="accent" />
      <circle cx="128" cy="96" r="3" fill="#11131B" />
      <path d="M30 60 Q45 50 60 60 Q45 58 30 66 Z" opacity="0.8" />
      <path d="M150 40 l10 -6 l10 6 l-10 -2 Z" opacity="0.8" />
      <path d="M140 165 q15 -12 30 0 q-15 12 -30 0 Z M170 165 l10 -8 v16 Z" opacity="0.7" />
      <g opacity="0.6"><circle cx="40" cy="160" r="5" /><circle cx="32" cy="150" r="3" /><circle cx="40" cy="146" r="3" /><circle cx="48" cy="150" r="3" /></g>
    </g>

    <!-- 植物世界 -->
    <g v-else-if="theme === 'plants'">
      <path d="M100 170 V80" stroke="#7BD84A" stroke-width="5" stroke-linecap="round" />
      <path d="M100 120 Q60 110 50 70 Q90 72 100 120 Z" :fill="accent" />
      <path d="M100 100 Q140 90 152 50 Q110 52 100 100 Z" fill="#3FD08A" />
      <path d="M100 145 Q140 140 155 110 Q115 108 100 145 Z" fill="#5ec26a" />
      <circle cx="100" cy="68" r="14" fill="#FF5DB7" />
      <circle cx="100" cy="68" r="6" fill="#FFC247" />
      <g fill="#fff" opacity="0.5"><circle cx="40" cy="40" r="2" /><circle cx="160" cy="150" r="2" /><circle cx="170" cy="40" r="1.5" /></g>
    </g>

    <!-- 人类文明：古代建筑轮廓 -->
    <g v-else-if="theme === 'civilization'">
      <path d="M20 160 L70 80 L120 160 Z" :fill="accent" />
      <path d="M70 80 L120 160 L95 160 Z" fill="#11131B" fill-opacity="0.25" />
      <g fill="#F5F5F7">
        <rect x="118" y="96" width="66" height="8" />
        <path d="M114 96 L151 74 L188 96 Z" />
        <rect x="124" y="106" width="7" height="50" /><rect x="139" y="106" width="7" height="50" />
        <rect x="154" y="106" width="7" height="50" /><rect x="169" y="106" width="7" height="50" />
        <rect x="118" y="156" width="66" height="6" />
      </g>
      <circle cx="160" cy="40" r="14" fill="#FFC247" opacity="0.9" />
      <rect x="10" y="160" width="180" height="4" fill="#F5F5F7" opacity="0.4" />
    </g>

    <!-- 科学奇迹：分子结构、原子轨道 -->
    <g v-else-if="theme === 'science'" fill="none" stroke-width="3">
      <ellipse cx="100" cy="100" rx="70" ry="24" :stroke="accent" />
      <ellipse cx="100" cy="100" rx="70" ry="24" stroke="#A45CFF" transform="rotate(60 100 100)" />
      <ellipse cx="100" cy="100" rx="70" ry="24" stroke="#FF5DB7" transform="rotate(-60 100 100)" />
      <circle cx="100" cy="100" r="12" fill="#FFC247" stroke="none" />
      <circle cx="170" cy="100" r="6" :fill="accent" stroke="none" />
      <circle cx="65" cy="40" r="6" fill="#A45CFF" stroke="none" />
      <circle cx="65" cy="160" r="6" fill="#FF5DB7" stroke="none" />
      <g stroke="#F5F5F7" stroke-opacity="0.5" stroke-width="2">
        <line x1="25" y1="170" x2="45" y2="155" /><line x1="45" y1="155" x2="40" y2="135" />
      </g>
      <g fill="#F5F5F7" fill-opacity="0.7" stroke="none">
        <circle cx="25" cy="170" r="5" /><circle cx="45" cy="155" r="5" /><circle cx="40" cy="135" r="4" />
      </g>
    </g>

    <!-- 世界奇观：山脉与地标 -->
    <g v-else-if="theme === 'wonders'">
      <circle cx="140" cy="55" r="18" fill="#FFC247" />
      <path d="M10 165 L60 90 L85 120 L115 70 L190 165 Z" :fill="accent" />
      <path d="M115 70 L102 90 L112 88 L118 96 L126 86 Z M60 90 L52 102 L60 100 L66 104 Z" fill="#F5F5F7" />
      <path d="M30 165 L36 120 L40 120 L46 165 Z M38 112 L38 120" fill="#F5F5F7" stroke="#F5F5F7" stroke-width="2" />
      <path d="M150 165 L156 128 h8 L170 165 Z M160 118 v10" fill="#F5F5F7" stroke="#F5F5F7" stroke-width="2" opacity="0.85" />
      <path d="M10 170 Q60 160 100 170 T190 170" stroke="#33D6E0" stroke-width="4" fill="none" />
    </g>

    <!-- 伟大人物：人物剪影 -->
    <g v-else-if="theme === 'people'">
      <circle cx="100" cy="78" r="28" :fill="accent" />
      <path d="M48 170 Q50 118 100 114 Q150 118 152 170 Z" :fill="accent" />
      <circle cx="50" cy="96" r="16" fill="#F5F5F7" opacity="0.6" />
      <path d="M20 170 Q22 134 50 130 Q78 134 80 170 Z" fill="#F5F5F7" opacity="0.6" />
      <circle cx="150" cy="96" r="16" fill="#F5F5F7" opacity="0.6" />
      <path d="M120 170 Q122 134 150 130 Q178 134 180 170 Z" fill="#F5F5F7" opacity="0.6" />
      <path d="M86 40 l14 -14 l14 14 l-6 -2 l-8 6 l-8 -6 Z" fill="#FFC247" />
    </g>

    <!-- 神秘未知 -->
    <g v-else-if="theme === 'mystery'">
      <path d="M100 30 L170 150 L30 150 Z" fill="none" :stroke="accent" stroke-width="4" />
      <ellipse cx="100" cy="112" rx="30" ry="16" fill="#F5F5F7" />
      <circle cx="100" cy="112" r="11" :fill="accent" />
      <circle cx="100" cy="112" r="5" fill="#11131B" />
      <g stroke="#FFC247" stroke-width="2" opacity="0.8">
        <line x1="100" y1="80" x2="100" y2="70" /><line x1="76" y1="88" x2="70" y2="80" /><line x1="124" y1="88" x2="130" y2="80" />
      </g>
      <path d="M150 40 a16 16 0 1 0 14 24 a12 12 0 1 1 -14 -24 Z" fill="#FFC247" opacity="0.9" />
      <path d="M10 170 Q50 158 90 170 T190 168" stroke="#F5F5F7" stroke-opacity="0.3" stroke-width="6" fill="none" />
    </g>

    <!-- 随机盲盒：彩色问号和几何图案 -->
    <g v-else>
      <rect x="22" y="30" width="34" height="34" rx="6" fill="#398BFF" transform="rotate(-15 39 47)" />
      <circle cx="160" cy="50" r="18" fill="#FFC247" />
      <path d="M30 150 L55 120 L80 150 Z" fill="#5CFFB0" />
      <rect x="140" y="130" width="34" height="34" rx="6" fill="#A45CFF" transform="rotate(20 157 147)" />
      <text x="100" y="135" text-anchor="middle" font-size="110" font-weight="900" font-family="Georgia, serif" fill="#FF5DB7" stroke="#F5F5F7" stroke-width="3">?</text>
    </g>
  </svg>
</template>
