import { defineStore } from 'pinia';
import type { GameSettings, GameStats } from '@/types';
import { db, defaultStats, getStats } from '@/database/db';
import { remainingFreePacks } from '@/services/pack/packService';
import { localDateString } from '@/utils/date';
import { setSoundEnabled } from '@/utils/sound';
import { clearExpiredCache } from '@/utils/cache';

let initPromise: Promise<void> | null = null;

const DEFAULT_SETTINGS: GameSettings = {
  animations: true,
  sound: true,
  language: 'zh',
};

export const useGameStore = defineStore('game', {
  state: () => ({
    stats: defaultStats() as GameStats,
    settings: { ...DEFAULT_SETTINGS } as GameSettings,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    today: localDateString(),
    loaded: false,
    reducedMotion: false,
  }),
  getters: {
    remainingFree(state): number {
      return remainingFreePacks(state.stats, state.today);
    },
    animationsOn(state): boolean {
      return state.settings.animations && !state.reducedMotion;
    },
  },
  actions: {
    init(): Promise<void> {
      if (!initPromise) initPromise = this.doInit();
      return initPromise;
    },
    async doInit() {
      try {
        await this.refreshStats();
        const rows = await db.settings.toArray();
        const s = { ...DEFAULT_SETTINGS };
        for (const r of rows) {
          if (r.key in s) (s as Record<string, unknown>)[r.key] = r.value;
        }
        this.settings = s;
      } catch (e) {
        console.warn('[WikiCard] IndexedDB 不可用', e);
      }
      setSoundEnabled(this.settings.sound);
      this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      window.addEventListener('online', () => (this.online = true));
      window.addEventListener('offline', () => (this.online = false));
      // 本地日期变化时自动重置每日次数
      setInterval(() => {
        const t = localDateString();
        if (t !== this.today) this.today = t;
      }, 30_000);
      void clearExpiredCache();
      this.loaded = true;
    },
    async refreshStats() {
      this.stats = await getStats();
      this.today = localDateString();
    },
    async updateSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
      this.settings[key] = value;
      if (key === 'sound') setSoundEnabled(value as boolean);
      await db.settings.put({ key, value });
    },
    /** 导入存档后重新读取设置和统计 */
    async reloadSettings() {
      await this.refreshStats();
      const rows = await db.settings.toArray();
      const s = { ...DEFAULT_SETTINGS };
      for (const r of rows) {
        if (r.key in s) (s as Record<string, unknown>)[r.key] = r.value;
      }
      this.settings = s;
      setSoundEnabled(s.sound);
    },
  },
});
