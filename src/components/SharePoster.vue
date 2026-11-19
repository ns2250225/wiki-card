<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { WikiCard } from '@/types';
import { getPackConfig } from '@/config/packs';
import { buildShareUrl, copyText } from '@/services/share/shareUrl';
import {
  downloadCanvas,
  generateCardPoster,
  generatePackPoster,
  nativeShare,
} from '@/services/share/posterGenerator';
import { X, Download, Link2, Share2, Loader2, Check } from 'lucide-vue-next';

const props = defineProps<{
  open: boolean;
  mode: 'card' | 'pack';
  card?: WikiCard | null;
  cards?: WikiCard[];
  packId?: string;
  newCount?: number;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();

const loading = ref(false);
const error = ref('');
const preview = ref('');
const copied = ref(false);
let canvas: HTMLCanvasElement | null = null;

const shareCards = computed<WikiCard[]>(() =>
  props.mode === 'card' ? (props.card ? [props.card] : []) : (props.cards ?? []),
);
const shareUrl = computed(() => buildShareUrl(shareCards.value, props.mode === 'pack' ? props.packId : undefined));
const title = computed(() => {
  if (props.mode === 'card') return props.card?.title ?? '知识卡牌';
  return `${getPackConfig(props.packId ?? '')?.name ?? '卡包'}开包结果`;
});
const filename = computed(() => {
  const base = props.mode === 'card' ? `wikicard-${props.card?.title ?? 'card'}` : `wikicard-pack-${props.packId ?? ''}`;
  return `${base.replace(/[\\/:*?"<>|\s]+/g, '_')}.png`;
});
const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

async function generate() {
  if (!shareCards.value.length) return;
  loading.value = true;
  error.value = '';
  preview.value = '';
  try {
    if (props.mode === 'card' && props.card) {
      canvas = await generateCardPoster(props.card, shareUrl.value);
    } else {
      const pack = getPackConfig(props.packId ?? '');
      canvas = await generatePackPoster(
        shareCards.value,
        {
          packName: pack?.name ?? 'WikiCard',
          accent: pack?.accent ?? '#A45CFF',
          newCount: props.newCount ?? 0,
        },
        shareUrl.value,
      );
    }
    preview.value = canvas.toDataURL('image/png');
  } catch (e) {
    console.error(e);
    error.value = '海报生成失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (v) => {
    if (v) void generate();
  },
  { immediate: true },
);

async function download() {
  if (canvas) await downloadCanvas(canvas, filename.value);
}
async function copyLink() {
  copied.value = await copyText(shareUrl.value);
  setTimeout(() => (copied.value = false), 1800);
}
async function share() {
  if (canvas) {
    const ok = await nativeShare(canvas, filename.value, title.value, shareUrl.value);
    if (!ok) await copyLink();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" @click.self="emit('close')">
        <div class="panel flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden" role="dialog" aria-modal="true" :aria-label="`分享 ${title}`">
          <div class="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <h3 class="font-bold">{{ mode === 'card' ? '分享卡牌' : '分享整包' }}</h3>
            <button class="rounded-lg p-1.5 hover:bg-white/10" aria-label="关闭" @click="emit('close')"><X :size="18" /></button>
          </div>
          <div class="flex-1 overflow-auto p-5">
            <div class="mx-auto flex items-center justify-center rounded-xl bg-bg/60" :class="mode === 'card' ? 'aspect-[3/4] max-w-[320px]' : 'aspect-[9/16] max-w-[260px]'">
              <Loader2 v-if="loading" class="animate-spin text-muted" :size="32" />
              <p v-else-if="error" class="px-6 text-center text-sm text-red-300">{{ error }}</p>
              <img v-else-if="preview" :src="preview" :alt="title" class="h-full w-full rounded-xl object-contain" />
            </div>
            <div class="mt-4 rounded-xl bg-bg/60 p-3">
              <p class="mb-1 text-xs text-muted">分享链接（对方打开后将从 Wikipedia 重新获取卡牌内容）</p>
              <p class="break-all text-xs text-ink/80">{{ shareUrl }}</p>
            </div>
          </div>
          <div class="flex flex-wrap justify-end gap-2 border-t border-white/5 px-5 py-3">
            <button class="btn-ghost" @click="copyLink">
              <component :is="copied ? Check : Link2" :size="16" />{{ copied ? '已复制' : '复制链接' }}
            </button>
            <button v-if="canNativeShare" class="btn-ghost" :disabled="!preview" @click="share"><Share2 :size="16" />分享</button>
            <button class="btn-primary" :disabled="!preview" @click="download"><Download :size="16" />下载 PNG</button>
            <button v-if="error" class="btn-ghost" @click="generate">重试</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
