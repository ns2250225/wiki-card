<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

/**
 * 横向滚动容器：
 * - 触屏：原生滑动
 * - 鼠标：按住拖动、滚轮纵向滚动转为横向
 * - 桌面端：左右箭头按钮 + 细滚动条
 */
const el = ref<HTMLElement | null>(null);
const canLeft = ref(false);
const canRight = ref(false);
const dragging = ref(false);

let startX = 0;
let startScroll = 0;
let pointerId: number | null = null;
let moved = false;

function update() {
  const s = el.value;
  if (!s) return;
  canLeft.value = s.scrollLeft > 2;
  canRight.value = s.scrollLeft + s.clientWidth < s.scrollWidth - 2;
}

function scrollByPage(dir: 1 | -1) {
  const s = el.value;
  if (!s) return;
  s.scrollBy({ left: dir * s.clientWidth * 0.8, behavior: 'smooth' });
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !el.value) return;
  pointerId = e.pointerId;
  startX = e.clientX;
  startScroll = el.value.scrollLeft;
  moved = false;
}

function onPointerMove(e: PointerEvent) {
  if (pointerId !== e.pointerId || !el.value) return;
  const dx = e.clientX - startX;
  if (!moved && Math.abs(dx) > 5) {
    moved = true;
    dragging.value = true;
    el.value.setPointerCapture(e.pointerId);
  }
  if (moved) el.value.scrollLeft = startScroll - dx;
}

function onPointerUp(e: PointerEvent) {
  if (pointerId !== e.pointerId) return;
  pointerId = null;
  if (el.value?.hasPointerCapture(e.pointerId)) el.value.releasePointerCapture(e.pointerId);
  dragging.value = false;
}

/** 拖动结束后阻止误触点击卡包 */
function onClickCapture(e: MouseEvent) {
  if (moved) {
    e.preventDefault();
    e.stopPropagation();
    moved = false;
  }
}

/** 鼠标滚轮：纵向滚动转为横向，滚到尽头时交还给页面 */
function onWheel(e: WheelEvent) {
  const s = el.value;
  if (!s || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const max = s.scrollWidth - s.clientWidth;
  if (max <= 0) return;
  const atStart = s.scrollLeft <= 0 && e.deltaY < 0;
  const atEnd = s.scrollLeft >= max - 1 && e.deltaY > 0;
  if (atStart || atEnd) return;
  e.preventDefault();
  s.scrollLeft += e.deltaY;
}

let ro: ResizeObserver | null = null;
onMounted(() => {
  update();
  el.value?.addEventListener('wheel', onWheel, { passive: false });
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    ro = new ResizeObserver(update);
    ro.observe(el.value);
  }
});
onBeforeUnmount(() => {
  el.value?.removeEventListener('wheel', onWheel);
  ro?.disconnect();
});
</script>

<template>
  <div class="relative">
    <div
      ref="el"
      class="h-scroller -mx-4 flex gap-4 overflow-x-auto overscroll-x-contain px-4 pb-4"
      :class="{ dragging }"
      @scroll.passive="update"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
      @dragstart.prevent
    >
      <slot />
    </div>
    <button
      v-show="canLeft"
      class="arrow left-0 -translate-x-1/2"
      aria-label="向左滚动"
      @click="scrollByPage(-1)"
    >
      <ChevronLeft :size="20" />
    </button>
    <button
      v-show="canRight"
      class="arrow right-0 translate-x-1/2"
      aria-label="向右滚动"
      @click="scrollByPage(1)"
    >
      <ChevronRight :size="20" />
    </button>
  </div>
</template>

<style scoped>
.h-scroller {
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  cursor: grab;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.h-scroller > :deep(*) {
  scroll-snap-align: start;
}
.h-scroller.dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  user-select: none;
}
.h-scroller::-webkit-scrollbar {
  height: 6px;
}
.h-scroller::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 99px;
}
.arrow {
  position: absolute;
  top: calc(50% - 8px);
  z-index: 5;
  display: none;
  height: 40px;
  width: 40px;
  transform-origin: center;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(28, 32, 48, 0.9);
  color: #f5f5f7;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  margin-top: -20px;
}
.arrow:hover {
  background: rgba(45, 50, 72, 0.95);
}
@media (hover: hover) and (pointer: fine) {
  .arrow {
    display: flex;
  }
}
</style>
