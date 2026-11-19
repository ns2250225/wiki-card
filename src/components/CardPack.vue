<script setup lang="ts">
import type { CardPack } from '@/types';
import PackArt from './PackArt.vue';

withDefaults(
  defineProps<{
    pack: CardPack;
    floating?: boolean;
    interactive?: boolean;
    showInfo?: boolean;
  }>(),
  { floating: false, interactive: true, showInfo: true },
);
const emit = defineEmits<{ (e: 'select', pack: CardPack): void }>();
</script>

<template>
  <div
    class="pack group"
    :class="{ 'anim-float': floating, interactive }"
    :style="{ '--accent': pack.accent }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="`卡包：${pack.name}`"
    @click="interactive && emit('select', pack)"
    @keydown.enter="interactive && emit('select', pack)"
  >
    <div class="pack-foil">
      <div class="pack-crimp top" />
      <div class="pack-content">
        <div class="pack-brand">WIKICARD</div>
        <div class="pack-art">
          <PackArt :theme="pack.coverTheme" :accent="pack.accent" />
        </div>
        <div class="pack-name">{{ pack.name }}</div>
        <div v-if="showInfo" class="pack-desc">{{ pack.description }}</div>
        <div class="pack-count">5 CARDS</div>
      </div>
      <div class="pack-crimp bottom" />
      <div class="pack-sheen" />
    </div>
  </div>
</template>

<style scoped>
.pack {
  container-type: inline-size;
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 7.4;
  user-select: none;
}
.pack.interactive {
  cursor: pointer;
}
.pack.interactive:hover .pack-foil {
  transform: translateY(-6px) rotate(-1.5deg);
  box-shadow:
    0 20px 40px -12px color-mix(in srgb, var(--accent) 60%, transparent),
    0 0 0 1px rgba(255, 255, 255, 0.08);
}
.pack-foil {
  position: absolute;
  inset: 0;
  border-radius: 3cqw;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 60%),
    linear-gradient(160deg, color-mix(in srgb, var(--accent) 35%, #1c2030), #11131b 70%);
  box-shadow:
    0 12px 30px -12px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}
.pack-crimp {
  position: absolute;
  left: 0;
  right: 0;
  height: 6cqw;
  z-index: 2;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0 2cqw, rgba(255, 255, 255, 0.05) 2cqw 4cqw);
}
.pack-crimp.top {
  top: 0;
}
.pack-crimp.bottom {
  bottom: 0;
}
.pack-content {
  position: absolute;
  inset: 6cqw 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3cqw 6cqw;
  text-align: center;
}
.pack-brand {
  font-family: Georgia, serif;
  font-weight: 800;
  letter-spacing: 0.3em;
  font-size: 5cqw;
  color: rgba(245, 245, 247, 0.7);
}
.pack-art {
  width: 82%;
  aspect-ratio: 1;
  margin: 3cqw 0 1cqw;
}
.pack-name {
  font-size: 10cqw;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #f5f5f7;
  text-shadow: 0 0 6cqw color-mix(in srgb, var(--accent) 80%, transparent);
}
.pack-desc {
  margin-top: 1.5cqw;
  font-size: 4.6cqw;
  color: rgba(245, 245, 247, 0.65);
  line-height: 1.35;
}
.pack-count {
  margin-top: auto;
  font-size: 4cqw;
  font-weight: 800;
  letter-spacing: 0.25em;
  color: var(--accent);
}
.pack-sheen {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.18) 45%, transparent 60%);
  background-size: 250% 100%;
  background-position: 120% 0;
  transition: background-position 0.8s ease;
}
.pack:hover .pack-sheen {
  background-position: -60% 0;
}
</style>
