<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{ message?: string; found?: number; total?: number; animated?: boolean }>(),
  { message: '', found: 0, total: 5, animated: true },
);

const MESSAGES = ['正在探索 Wikipedia...', '正在寻找未知知识...', '正在收集百科条目...', '正在生成你的知识卡牌...'];
const tip = ref(MESSAGES[0]);
let tipIndex = 0;
let tipTimer: ReturnType<typeof setInterval> | undefined;

const canvas = ref<HTMLCanvasElement | null>(null);
let raf = 0;
let onResize: (() => void) | null = null;

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

onMounted(() => {
  tipTimer = setInterval(() => {
    tipIndex = (tipIndex + 1) % MESSAGES.length;
    tip.value = MESSAGES[tipIndex];
  }, 1800);

  const c = canvas.value;
  if (!c || !props.animated) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  let h = 0;
  const resize = () => {
    w = c.clientWidth;
    h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const nodes: Node[] = Array.from({ length: 46 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.8 + 0.6,
    hue: [215, 270, 325, 40][Math.floor(Math.random() * 4)],
  }));
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    // 知识节点连线
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          ctx.strokeStyle = `hsla(${a.hue},90%,70%,${(1 - d / 110) * 0.35})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = `hsla(${n.hue},90%,75%,0.9)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
  onResize = resize;
  window.addEventListener('resize', resize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  if (onResize) window.removeEventListener('resize', onResize);
  if (tipTimer) clearInterval(tipTimer);
});
</script>

<template>
  <div class="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden rounded-3xl">
    <canvas ref="canvas" class="absolute inset-0 h-full w-full" aria-hidden="true" />
    <!-- 旋转盲盒 -->
    <div class="relative z-10 mb-10" style="perspective: 600px">
      <div class="cube" :class="{ still: !animated }">
        <div v-for="face in ['front', 'back', 'right', 'left', 'top', 'bottom']" :key="face" class="face" :class="face">?</div>
      </div>
    </div>
    <p class="relative z-10 text-lg font-bold text-ink" aria-live="polite">{{ tip }}</p>
    <p class="relative z-10 mt-2 h-5 max-w-[90%] truncate text-sm text-muted">{{ message }}</p>
    <div class="relative z-10 mt-5 w-64 max-w-[80%]">
      <div class="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{
            width: `${Math.max(8, (found / total) * 100)}%`,
            background: 'linear-gradient(90deg,#398BFF,#A45CFF,#FF5DB7)',
          }"
        />
      </div>
      <p class="mt-2 text-center text-xs text-muted">已找到 {{ found }} / {{ total }} 篇百科条目</p>
    </div>
  </div>
</template>

<style scoped>
.cube {
  width: 84px;
  height: 84px;
  position: relative;
  transform-style: preserve-3d;
  animation: cube-spin 3.2s linear infinite;
}
.cube.still {
  animation: none;
  transform: rotateX(-20deg) rotateY(30deg);
}
.face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Georgia, serif;
  font-size: 44px;
  font-weight: 900;
  color: #f5f5f7;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(57, 139, 255, 0.75), rgba(164, 92, 255, 0.75) 55%, rgba(255, 93, 183, 0.75));
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.25);
}
.front {
  transform: translateZ(42px);
}
.back {
  transform: rotateY(180deg) translateZ(42px);
}
.right {
  transform: rotateY(90deg) translateZ(42px);
}
.left {
  transform: rotateY(-90deg) translateZ(42px);
}
.top {
  transform: rotateX(90deg) translateZ(42px);
}
.bottom {
  transform: rotateX(-90deg) translateZ(42px);
}
</style>
