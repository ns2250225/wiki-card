<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import gsap from 'gsap';
import type { CardPack, OpenPackResult, WikiCard } from '@/types';
import { rarityRank } from '@/config/rarity';
import { sfx } from '@/utils/sound';
import CardPackView from './CardPack.vue';
import CardFlip from './CardFlip.vue';
import { Sparkles, FolderInput, Eye } from 'lucide-vue-next';

const props = defineProps<{
  pack: CardPack;
  result: OpenPackResult;
  animated: boolean;
}>();
const emit = defineEmits<{ (e: 'done'): void; (e: 'select', card: WikiCard): void }>();

type Phase = 'pack' | 'tearing' | 'cards' | 'revealed' | 'collecting';
const phase = ref<Phase>(props.animated ? 'pack' : 'revealed');
const flipped = ref<boolean[]>(props.result.cards.map(() => !props.animated));
const flash = ref<string | null>(null);

const packWrap = ref<HTMLElement | null>(null);
const packTop = ref<HTMLElement | null>(null);
const packBody = ref<HTMLElement | null>(null);
const tearGlow = ref<HTMLElement | null>(null);
const slots = ref<HTMLElement[]>([]);
const setSlot = (el: unknown, i: number) => {
  if (el) slots.value[i] = el as HTMLElement;
};

const allFlipped = computed(() => flipped.value.every(Boolean));
const tweens: gsap.core.Animation[] = [];
let flipAllRunning = false;

onMounted(async () => {
  if (!props.animated) return;
  await nextTick();
  if (packWrap.value) {
    tweens.push(gsap.from(packWrap.value, { scale: 0.6, opacity: 0, y: 40, duration: 0.6, ease: 'back.out(1.6)' }));
  }
});

onBeforeUnmount(() => tweens.forEach((t) => t.kill()));

/** 卡包震动 → 撕开 → 五张卡牌飞出 */
async function tear() {
  if (phase.value !== 'pack') return;
  phase.value = 'tearing';
  sfx.shake();
  const wrap = packWrap.value!;
  const tl = gsap.timeline();
  tweens.push(tl);
  tl.to(wrap, { x: -8, rotation: -3, duration: 0.05, repeat: 9, yoyo: true, ease: 'sine.inOut' })
    .to(wrap, { x: 0, rotation: 0, duration: 0.05 })
    .add(() => sfx.tear())
    .to(tearGlow.value, { opacity: 1, scaleX: 1, duration: 0.15 }, '<')
    .to(packTop.value, { y: -160, x: 120, rotation: 28, opacity: 0, duration: 0.6, ease: 'power2.out' }, '<')
    .to(tearGlow.value, { opacity: 0, duration: 0.4 });
  await tl.then();

  phase.value = 'cards';
  await nextTick();
  sfx.whoosh();
  const packRect = (packBody.value ?? wrap).getBoundingClientRect();
  const cx = packRect.left + packRect.width / 2;
  const cy = packRect.top + packRect.height * 0.35;
  slots.value.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    tweens.push(
      gsap.fromTo(
        el,
        { x: dx, y: dy, scale: 0.3, rotation: (i - 2) * 12, opacity: 0 },
        { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.7, delay: 0.1 + i * 0.12, ease: 'back.out(1.3)' },
      ),
    );
  });
  if (packBody.value) {
    tweens.push(gsap.to(packBody.value, { y: 120, opacity: 0, duration: 0.6, delay: 0.25, ease: 'power2.in' }));
  }
}

function flip(i: number) {
  if (flipped.value[i] || phase.value !== 'cards') return;
  const card = props.result.cards[i];
  flipped.value[i] = true;
  sfx.flip(card.rarity);
  if (rarityRank(card.rarity) >= rarityRank('legendary') && props.animated) {
    flash.value = card.rarity;
    setTimeout(() => (flash.value = null), 700);
    const el = slots.value[i];
    if (el) tweens.push(gsap.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  }
  if (flipped.value.every(Boolean)) {
    setTimeout(() => {
      phase.value = 'revealed';
      sfx.success();
    }, 600);
  }
}

/** 逐张翻开全部卡牌 */
async function flipAll() {
  if (flipAllRunning) return;
  flipAllRunning = true;
  for (let i = 0; i < props.result.cards.length; i++) {
    if (!flipped.value[i]) {
      flip(i);
      await new Promise((r) => setTimeout(r, 380));
    }
  }
  flipAllRunning = false;
}

function skip() {
  tweens.forEach((t) => t.progress(1).kill());
  flipped.value = props.result.cards.map(() => true);
  phase.value = 'revealed';
}

/** 卡牌收藏飞入图鉴 */
async function collect() {
  if (phase.value !== 'revealed') return;
  if (!props.animated) {
    emit('done');
    return;
  }
  phase.value = 'collecting';
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-nav="codex"]')).find(
    (el) => el.getBoundingClientRect().width > 0,
  );
  const tr = target?.getBoundingClientRect();
  const tx = tr ? tr.left + tr.width / 2 : window.innerWidth / 2;
  const ty = tr && tr.width > 0 ? tr.top + tr.height / 2 : 0;
  sfx.whoosh();
  await Promise.all(
    slots.value.map((el, i) => {
      const r = el.getBoundingClientRect();
      return gsap
        .to(el, {
          x: tx - (r.left + r.width / 2),
          y: ty - (r.top + r.height / 2),
          scale: 0.08,
          rotation: 20,
          opacity: 0.2,
          duration: 0.6,
          delay: i * 0.08,
          ease: 'power2.in',
        })
        .then();
    }),
  );
  if (target) gsap.fromTo(target, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.4)' });
  emit('done');
}
</script>

<template>
  <div class="relative flex min-h-[70vh] flex-col items-center justify-center py-6">
    <!-- 稀有闪屏 -->
    <div
      v-if="flash"
      class="pointer-events-none fixed inset-0 z-40 transition-opacity"
      :style="{
        background:
          flash === 'mythic'
            ? 'radial-gradient(circle, rgba(255,93,183,0.45), rgba(57,139,255,0.25) 50%, transparent 75%)'
            : 'radial-gradient(circle, rgba(255,194,71,0.45), transparent 70%)',
      }"
    />

    <!-- 卡包 -->
    <div
      v-if="phase === 'pack' || phase === 'tearing' || phase === 'cards'"
      ref="packWrap"
      class="pack-stage"
      :class="{ 'is-overlay': phase === 'cards' }"
      @click="tear"
    >
      <div class="relative w-[min(62vw,260px)]">
        <div ref="packBody" class="pack-piece body">
          <CardPackView :pack="pack" :interactive="false" :show-info="false" />
        </div>
        <div ref="packTop" class="pack-piece top">
          <CardPackView :pack="pack" :interactive="false" :show-info="false" />
        </div>
        <div ref="tearGlow" class="tear-glow" />
      </div>
      <p v-if="phase === 'pack'" class="mt-6 animate-pulse text-center text-sm font-semibold text-ink/80">
        点击卡包，撕开它！
      </p>
    </div>

    <!-- 卡牌 -->
    <div v-if="phase !== 'pack' && phase !== 'tearing'" class="card-row">
      <div v-for="(card, i) in result.cards" :key="card.id" :ref="(el) => setSlot(el, i)" class="slot">
        <CardFlip
          :card="card"
          :flipped="flipped[i]"
          :is-new="result.newFlags[i]"
          :count="result.counts[i]"
          :instant="!animated"
          :effects="animated"
          @flip="flip(i)"
          @select="emit('select', $event)"
        />
      </div>
    </div>

    <!-- 操作 -->
    <div class="mt-8 flex min-h-[48px] flex-wrap items-center justify-center gap-3">
      <template v-if="phase === 'pack' || phase === 'tearing'">
        <button class="btn-ghost" @click.stop="skip">跳过动画</button>
      </template>
      <template v-else-if="phase === 'cards'">
        <p class="w-full text-center text-sm text-muted">点击卡牌逐张翻开</p>
        <button v-if="!allFlipped" class="btn-primary" @click="flipAll"><Eye :size="16" />全部翻开</button>
      </template>
      <template v-else-if="phase === 'revealed'">
        <button class="btn-primary" @click="collect"><FolderInput :size="16" />收入图鉴</button>
        <span class="flex items-center gap-1 text-sm text-muted">
          <Sparkles :size="14" />新获得 {{ result.history.newCardCount }} 张 · 重复 {{ result.history.duplicateCount }} 张
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pack-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  z-index: 20;
}
.pack-stage.is-overlay {
  position: absolute;
  inset: 0;
  justify-content: center;
  pointer-events: none;
}
.pack-piece {
  width: 100%;
}
.pack-piece.top {
  position: absolute;
  inset: 0;
  clip-path: inset(0 0 84% 0);
}
.pack-piece.body {
  clip-path: inset(16% 0 0 0);
}
.tear-glow {
  position: absolute;
  left: -10%;
  right: -10%;
  top: 15%;
  height: 4%;
  border-radius: 50%;
  background: radial-gradient(ellipse, #fff 0%, rgba(255, 194, 71, 0.8) 40%, transparent 70%);
  filter: blur(4px);
  opacity: 0;
  transform: scaleX(0.3);
}
.card-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  width: 100%;
  max-width: 1100px;
}
.slot {
  width: clamp(100px, 29vw, 190px);
}
@media (min-width: 768px) {
  .slot {
    width: clamp(150px, 17vw, 200px);
  }
  .card-row {
    gap: 20px;
  }
}
</style>
