<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Download, Upload, Trash2, Wifi, Loader2, CheckCircle2, XCircle, Database, Volume2, Sparkles, Languages, Info } from 'lucide-vue-next';
import { useGameStore } from '@/stores/gameStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { exportSave, importSave, resetAllData, validateSave, type SaveValidation } from '@/database/saveManager';
import { cacheSize, clearAllCache } from '@/utils/cache';
import { runConnectivityCheck, type ConnectivityResult } from '@/services/wikipedia';
import { formatDateTime } from '@/utils/date';

const game = useGameStore();
const collection = useCollectionStore();

const message = ref('');
const importing = ref<SaveValidation | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const cacheCount = ref(0);
const checks = ref<ConnectivityResult[]>([]);
const checking = ref(false);

onMounted(async () => {
  cacheCount.value = await cacheSize();
});

function toast(msg: string) {
  message.value = msg;
  setTimeout(() => {
    if (message.value === msg) message.value = '';
  }, 3000);
}

async function doExport() {
  const name = await exportSave();
  toast(`已导出 ${name}`);
}

function pickFile() {
  fileInput.value?.click();
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    importing.value = { ok: false, errors: ['文件过大'], warnings: [] };
    return;
  }
  importing.value = validateSave(await file.text());
}

async function confirmImport() {
  if (!importing.value?.save) return;
  busy.value = true;
  try {
    await importSave(importing.value.save);
    await Promise.all([game.reloadSettings(), collection.refresh()]);
    importing.value = null;
    toast('存档已恢复');
  } catch (e) {
    toast(`导入失败：${(e as Error).message}`);
  } finally {
    busy.value = false;
  }
}

async function doReset() {
  if (!confirm('确定要清空所有卡牌、收藏、开包记录和设置吗？此操作无法撤销。')) return;
  if (!confirm('再次确认：建议先导出存档备份。仍要清空吗？')) return;
  await resetAllData();
  await Promise.all([game.reloadSettings(), collection.refresh()]);
  cacheCount.value = 0;
  toast('所有数据已清空');
}

async function doClearCache() {
  await clearAllCache();
  cacheCount.value = 0;
  toast('API 缓存已清除（不影响收藏）');
}

async function doCheck() {
  checking.value = true;
  checks.value = [];
  try {
    checks.value = await runConnectivityCheck(game.settings.language);
  } finally {
    checking.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h1 class="text-2xl font-black">设置</h1>

    <!-- 游戏设置 -->
    <section class="panel divide-y divide-white/5">
      <label class="flex cursor-pointer items-center justify-between gap-4 p-5">
        <span class="flex items-center gap-3">
          <Sparkles :size="18" class="text-epic" />
          <span>
            <span class="block font-semibold">动画效果</span>
            <span class="text-xs text-muted">拆包、翻牌、稀有度特效。{{ game.reducedMotion ? '系统已开启"减少动态效果"，动画将自动关闭。' : '' }}</span>
          </span>
        </span>
        <input type="checkbox" class="h-5 w-5 accent-epic" :checked="game.settings.animations" @change="game.updateSetting('animations', ($event.target as HTMLInputElement).checked)" />
      </label>
      <label class="flex cursor-pointer items-center justify-between gap-4 p-5">
        <span class="flex items-center gap-3">
          <Volume2 :size="18" class="text-rare" />
          <span>
            <span class="block font-semibold">音效</span>
            <span class="text-xs text-muted">开包与稀有卡牌音效（浏览器合成，无需下载）</span>
          </span>
        </span>
        <input type="checkbox" class="h-5 w-5 accent-epic" :checked="game.settings.sound" @change="game.updateSetting('sound', ($event.target as HTMLInputElement).checked)" />
      </label>
      <div class="flex items-center justify-between gap-4 p-5">
        <span class="flex items-center gap-3">
          <Languages :size="18" class="text-legendary" />
          <span>
            <span class="block font-semibold">知识语言</span>
            <span class="text-xs text-muted">新开卡包时使用的 Wikipedia 语言版本。不同语言的同一知识视为不同卡牌。</span>
          </span>
        </span>
        <select class="input w-32" :value="game.settings.language" @change="game.updateSetting('language', ($event.target as HTMLSelectElement).value as 'zh' | 'en')">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>
    </section>

    <!-- 存档管理 -->
    <section class="panel p-5">
      <h2 class="section-title text-base"><Database :size="18" />存档管理</h2>
      <p class="mb-4 text-sm text-muted">
        卡牌、收藏、开包记录、每日次数、保底计数和设置均自动保存在浏览器 IndexedDB 中。导出的存档包含卡牌的完整基础信息。
      </p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-primary" @click="doExport"><Download :size="16" />导出存档 JSON</button>
        <button class="btn-ghost" @click="pickFile"><Upload :size="16" />导入存档</button>
        <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile" />
        <button class="btn-danger" @click="doReset"><Trash2 :size="16" />清空所有数据</button>
      </div>

      <div v-if="importing" class="mt-5 rounded-xl border border-white/10 bg-bg/60 p-4 text-sm">
        <template v-if="importing.ok && importing.summary">
          <p class="font-bold">存档校验通过</p>
          <ul class="mt-2 grid grid-cols-2 gap-1 text-muted">
            <li>存档版本：v{{ importing.summary.version }}</li>
            <li>导出时间：{{ importing.summary.exportedAt ? formatDateTime(Date.parse(importing.summary.exportedAt)) : '未知' }}</li>
            <li>卡牌数据：{{ importing.summary.cardCount }} 张</li>
            <li>已收集：{{ importing.summary.collectedCount }} 种</li>
            <li>累计获得：{{ importing.summary.totalObtained }} 张</li>
            <li>开包记录：{{ importing.summary.packCount }} 条</li>
          </ul>
          <ul v-if="importing.warnings.length" class="mt-2 max-h-24 overflow-auto text-xs text-amber-200">
            <li v-for="w in importing.warnings" :key="w">⚠ {{ w }}</li>
          </ul>
          <p class="mt-3 text-amber-200">导入将覆盖当前所有游戏数据。</p>
          <div class="mt-3 flex gap-2">
            <button class="btn-primary" :disabled="busy" @click="confirmImport">
              <Loader2 v-if="busy" class="animate-spin" :size="16" />确认覆盖并恢复
            </button>
            <button class="btn-ghost" @click="importing = null">取消</button>
          </div>
        </template>
        <template v-else>
          <p class="font-bold text-red-300">存档校验失败</p>
          <ul class="mt-2 max-h-40 overflow-auto text-xs text-red-200">
            <li v-for="e in importing.errors" :key="e">· {{ e }}</li>
          </ul>
          <button class="btn-ghost mt-3" @click="importing = null">关闭</button>
        </template>
      </div>
    </section>

    <!-- API -->
    <section class="panel p-5">
      <h2 class="section-title text-base"><Wifi :size="18" />Wikipedia API</h2>
      <p class="mb-4 text-sm text-muted">
        WikiCard 直接从浏览器请求 Wikipedia（REST API 与带 origin=* 的 Action API），无后端、无代理。请求有并发限制、超时、指数退避重试并遵循 Retry-After。
      </p>
      <div class="flex flex-wrap gap-2">
        <button class="btn-ghost" :disabled="checking || !game.online" @click="doCheck">
          <Loader2 v-if="checking" class="animate-spin" :size="16" /><Wifi v-else :size="16" />API 跨域连通性检测
        </button>
        <button class="btn-ghost" @click="doClearCache"><Trash2 :size="16" />清除 API 缓存（{{ cacheCount }} 条）</button>
      </div>
      <table v-if="checks.length" class="mt-4 w-full text-sm">
        <tbody>
          <tr v-for="c in checks" :key="c.name" class="border-t border-white/5">
            <td class="py-2">
              <CheckCircle2 v-if="c.ok" :size="16" class="text-green-400" />
              <XCircle v-else :size="16" class="text-red-400" />
            </td>
            <td class="py-2 font-semibold">{{ c.name }}</td>
            <td class="py-2 text-muted">{{ c.api }}</td>
            <td class="py-2 text-right text-xs text-muted">{{ c.ok ? `${c.ms} ms` : c.message }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 关于 -->
    <section class="panel p-5 text-sm leading-relaxed text-muted">
      <h2 class="section-title text-base"><Info :size="18" />关于 WikiCard</h2>
      <p>WikiCard 是一个以 Wikipedia 为实时知识源的纯前端知识盲盒游戏。不预置任何卡牌、知识或图片，每次开包都是一次真实的知识探索。</p>
      <p class="mt-2">
        卡牌文字来自 Wikipedia，遵循 CC BY-SA 4.0 许可；图片来自 Wikipedia / Wikimedia Commons，版权归原作者所有，许可信息见各卡牌详情。稀有度为游戏系统随机分配，与条目实际重要性无关。
      </p>
      <p class="mt-2">无注册、无登录、无后端，所有数据仅保存在你的浏览器中。保底与每日次数仅用于娱乐体验。</p>
    </section>

    <Transition name="modal">
      <div v-if="message" class="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-xl md:bottom-8">
        {{ message }}
      </div>
    </Transition>
  </div>
</template>
