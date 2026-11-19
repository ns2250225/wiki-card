<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ExternalLink, Share2, Lightbulb, Languages, Image as ImageIcon, ListTree, Info, Loader2 } from 'lucide-vue-next';
import type { OwnedCard } from '@/types';
import { RARITY_MAP } from '@/config/rarity';
import { getPackConfig } from '@/config/packs';
import { useCardStore } from '@/stores/cardStore';
import { useGameStore } from '@/stores/gameStore';
import { formatDateTime } from '@/utils/date';
import WikiCardView from '@/components/WikiCard.vue';
import SharePoster from '@/components/SharePoster.vue';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const game = useGameStore();

const card = ref<OwnedCard | null>(null);
const loading = ref(true);
const shareOpen = ref(false);
const showFullExtract = ref(false);

const id = computed(() => String(route.params.id ?? ''));
const rarity = computed(() => (card.value ? RARITY_MAP[card.value.rarity] : null));
const extras = computed(() => (card.value ? cardStore.extras[card.value.id] : undefined));
const packName = computed(() => (card.value?.packId ? getPackConfig(card.value.packId)?.name : undefined));
const owned = computed(() => (card.value?.count ?? 0) > 0);
const topLanguages = computed(() => {
  const prefer = ['en', 'zh', 'ja', 'fr', 'de', 'es', 'ru', 'ko', 'it', 'pt'];
  const list = extras.value?.languages ?? [];
  return [...list].sort((a, b) => {
    const ia = prefer.indexOf(a.code);
    const ib = prefer.indexOf(b.code);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
});
const otherFacts = computed(() =>
  (extras.value?.extras?.facts ?? []).filter((f) => f !== card.value?.funFact).slice(0, 4),
);

function wikiLangUrl(code: string, key: string) {
  return `https://${code}.wikipedia.org/wiki/${encodeURIComponent(key)}`;
}

async function load() {
  loading.value = true;
  card.value = (await cardStore.getCard(id.value)) ?? null;
  loading.value = false;
  if (card.value && game.online) void cardStore.loadExtras(card.value);
}

watch(id, load);
onMounted(load);
</script>

<template>
  <div>
    <button class="mb-4 flex items-center gap-1 text-sm text-muted hover:text-ink" @click="router.back()">
      <ArrowLeft :size="16" />返回
    </button>

    <div v-if="loading" class="flex justify-center py-20"><Loader2 class="animate-spin text-muted" :size="32" /></div>

    <div v-else-if="!card" class="panel p-10 text-center">
      <p class="text-lg font-bold">没有找到这张卡牌</p>
      <p class="mt-2 text-sm text-muted">卡牌只保存在发现它的浏览器中。</p>
      <RouterLink to="/codex" class="btn-primary mt-4">返回图鉴</RouterLink>
    </div>

    <div v-else class="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
      <!-- 卡牌 -->
      <div class="mx-auto w-full max-w-[360px] md:sticky md:top-20 md:self-start">
        <WikiCardView :card="card" :count="card.count" :unowned="!owned" tilt eager />
        <div class="mt-5 grid grid-cols-2 gap-2">
          <button class="btn-ghost" @click="shareOpen = true"><Share2 :size="16" />分享卡牌</button>
          <a class="btn-ghost" :href="card.wikiUrl" target="_blank" rel="noopener noreferrer"><ExternalLink :size="16" />原文</a>
        </div>
      </div>

      <!-- 信息 -->
      <div class="min-w-0 space-y-6">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full px-3 py-0.5 text-xs font-extrabold tracking-wider"
              :style="{ color: rarity?.color, background: `${rarity?.color}22` }"
            >
              {{ rarity?.name }} · {{ rarity?.label }}
            </span>
            <span class="chip">{{ card.category }}</span>
            <span v-if="packName" class="chip">来自「{{ packName }}」</span>
            <span v-if="!owned" class="chip border-amber-400/30 text-amber-200">尚未收集</span>
          </div>
          <h1 class="mt-3 text-3xl font-black sm:text-4xl">{{ card.title }}</h1>
          <p v-if="card.englishTitle" class="mt-1 text-sm uppercase tracking-widest text-muted">{{ card.englishTitle }}</p>
          <p class="mt-3 text-lg text-ink/90">{{ card.description }}</p>
        </div>

        <div class="panel p-5">
          <h2 class="mb-2 text-sm font-bold text-muted">知识简介</h2>
          <p class="whitespace-pre-line leading-relaxed text-ink/90" :class="{ 'line-clamp-6': !showFullExtract }">{{ card.extract }}</p>
          <button v-if="card.extract.length > 220" class="mt-2 text-sm text-rare" @click="showFullExtract = !showFullExtract">
            {{ showFullExtract ? '收起' : '展开全部' }}
          </button>
        </div>

        <div v-if="card.funFact" class="rounded-2xl border border-legendary/20 bg-legendary/5 p-5">
          <h2 class="mb-2 flex items-center gap-1.5 text-sm font-bold text-legendary"><Lightbulb :size="16" />趣味知识</h2>
          <p class="leading-relaxed">{{ card.funFact }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div class="panel p-3">
            <p class="text-xs text-muted">拥有数量</p>
            <p class="mt-1 text-xl font-black">{{ card.count }}</p>
          </div>
          <div class="panel p-3">
            <p class="text-xs text-muted">首次获得</p>
            <p class="mt-1 font-semibold">{{ card.firstObtainedAt ? formatDateTime(card.firstObtainedAt) : '—' }}</p>
          </div>
          <div class="panel p-3">
            <p class="text-xs text-muted">最近获得</p>
            <p class="mt-1 font-semibold">{{ card.lastObtainedAt ? formatDateTime(card.lastObtainedAt) : '—' }}</p>
          </div>
          <div class="panel p-3">
            <p class="text-xs text-muted">卡牌编号</p>
            <p class="mt-1 font-mono font-semibold">{{ card.id }}</p>
          </div>
        </div>

        <a :href="card.wikiUrl" target="_blank" rel="noopener noreferrer" class="btn-primary w-full py-3.5 text-base">
          <ExternalLink :size="18" />在 Wikipedia 中阅读完整文章
        </a>

        <!-- 扩展知识（按需请求完整 HTML） -->
        <div v-if="extras?.loading" class="panel flex items-center gap-2 p-5 text-sm text-muted">
          <Loader2 class="animate-spin" :size="16" />正在从 Wikipedia 获取扩展知识...
        </div>
        <template v-else-if="extras">
          <div v-if="otherFacts.length" class="panel p-5">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-bold text-muted"><Lightbulb :size="16" />更多知识点</h2>
            <ul class="space-y-2">
              <li v-for="f in otherFacts" :key="f" class="flex gap-2 text-sm leading-relaxed text-ink/90">
                <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-epic" />{{ f }}
              </li>
            </ul>
          </div>

          <div v-if="extras.extras?.sections.length" class="panel p-5">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-bold text-muted"><ListTree :size="16" />文章章节</h2>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="s in extras.extras.sections"
                :key="s"
                class="chip hover:text-ink"
                :href="`${card.wikiUrl}#${encodeURIComponent(s.replace(/ /g, '_'))}`"
                target="_blank"
                rel="noopener noreferrer"
                >{{ s }}</a
              >
            </div>
          </div>

          <div v-if="extras.extras?.images.length" class="panel p-5">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-bold text-muted"><ImageIcon :size="16" />文章插图</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <figure v-for="img in extras.extras.images" :key="img.src" class="overflow-hidden rounded-xl bg-bg/60">
                <img :src="img.src" :alt="img.caption ?? card.title" loading="lazy" class="aspect-[4/3] w-full object-cover" referrerpolicy="no-referrer" />
                <figcaption v-if="img.caption" class="line-clamp-2 p-2 text-[11px] text-muted">{{ img.caption }}</figcaption>
              </figure>
            </div>
          </div>

          <div v-if="topLanguages.length" class="panel p-5">
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-bold text-muted">
              <Languages :size="16" />其他语言版本（{{ topLanguages.length }}）
            </h2>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="l in topLanguages.slice(0, 16)"
                :key="l.code"
                :href="wikiLangUrl(l.code, l.key)"
                target="_blank"
                rel="noopener noreferrer"
                class="chip hover:text-ink"
                >{{ l.name }} · {{ l.title }}</a
              >
            </div>
          </div>
          <p v-if="extras.error && !extras.extras" class="text-xs text-muted">扩展知识暂时无法加载：{{ extras.error }}</p>
        </template>

        <!-- 来源与许可 -->
        <div class="panel p-5 text-xs leading-relaxed text-muted">
          <h2 class="mb-2 flex items-center gap-1.5 text-sm font-bold"><Info :size="16" />来源与许可</h2>
          <p>
            文字内容来自
            <a :href="card.wikiUrl" target="_blank" rel="noopener noreferrer" class="text-rare underline">Wikipedia（{{ card.wikiLanguage }}）</a>，
            遵循 {{ extras?.detail?.license?.title ?? card.sourceLicense ?? 'CC BY-SA 4.0' }} 许可。
            <template v-if="extras?.detail?.latest?.id ?? card.revisionId">修订版本 #{{ extras?.detail?.latest?.id ?? card.revisionId }}。</template>
          </p>
          <p v-if="card.wikibaseItem" class="mt-1">
            Wikidata：
            <a :href="`https://www.wikidata.org/wiki/${card.wikibaseItem}`" target="_blank" rel="noopener noreferrer" class="text-rare underline">{{
              card.wikibaseItem
            }}</a>
          </p>
          <p v-if="card.imageUrl" class="mt-1">
            图片来源：
            <a
              :href="extras?.imageLicense?.descriptionUrl ?? card.imageSourceUrl ?? card.originalImageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-rare underline"
              >{{ extras?.imageLicense?.fileTitle ?? 'Wikimedia' }}</a
            >
            <template v-if="extras?.imageLicense?.artist ?? false"> · 作者 {{ extras?.imageLicense?.artist }}</template>
            <template v-if="extras?.imageLicense?.license ?? card.imageLicense"> · {{ extras?.imageLicense?.license ?? card.imageLicense }}</template>
          </p>
          <p v-else class="mt-1">该条目没有图片，卡牌使用动态生成的主题背景。</p>
        </div>
      </div>
    </div>

    <SharePoster v-if="card" :open="shareOpen" mode="card" :card="card" @close="shareOpen = false" />
  </div>
</template>
