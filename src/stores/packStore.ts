import { defineStore } from 'pinia';
import type { OpenPackResult } from '@/types';
import { openPack } from '@/services/pack/packOpening';
import { NoFreePacksError, OfflineError } from '@/services/pack/packService';
import { ConsecutiveFailureError, InsufficientCardsError } from '@/services/card/cardGenerator';
import { BudgetExceededError, WikiApiError, describeError } from '@/services/wikipedia/client';
import { useGameStore } from './gameStore';
import { useCollectionStore } from './collectionStore';

export type OpenStatus = 'idle' | 'loading' | 'ready' | 'error';
export type OpenErrorKind = 'offline' | 'quota' | 'ratelimit' | 'network' | 'insufficient' | 'budget' | 'other';

export const usePackStore = defineStore('pack', {
  state: () => ({
    status: 'idle' as OpenStatus,
    packId: '',
    progress: { message: '', found: 0, total: 5 },
    result: null as OpenPackResult | null,
    error: '',
    errorKind: 'other' as OpenErrorKind,
    /** 已播放过开包动画的记录 ID，避免重复播放 */
    viewedId: '',
  }),
  getters: {
    busy: (s) => s.status === 'loading',
  },
  actions: {
    reset() {
      if (this.status === 'loading') return;
      this.status = 'idle';
      this.result = null;
      this.error = '';
      this.progress = { message: '', found: 0, total: 5 };
    },
    /** 开包：加载中不允许重复点击 */
    async open(packId: string): Promise<OpenPackResult | null> {
      if (this.status === 'loading') return null;
      const game = useGameStore();
      const collection = useCollectionStore();
      this.status = 'loading';
      this.packId = packId;
      this.result = null;
      this.error = '';
      this.progress = { message: '正在探索 Wikipedia...', found: 0, total: 5 };
      try {
        const result = await openPack(packId, {
          language: game.settings.language,
          onProgress: (p) => {
            this.progress = { message: p.message, found: p.found, total: p.total };
          },
        });
        this.result = result;
        this.status = 'ready';
        await Promise.all([game.refreshStats(), collection.refresh()]);
        return result;
      } catch (e) {
        this.status = 'error';
        this.error = describeError(e);
        this.errorKind = classify(e);
        await game.refreshStats();
        return null;
      }
    },
  },
});

function classify(e: unknown): OpenErrorKind {
  if (e instanceof OfflineError) return 'offline';
  if (e instanceof NoFreePacksError) return 'quota';
  if (e instanceof InsufficientCardsError) return 'insufficient';
  if (e instanceof BudgetExceededError) return 'budget';
  if (e instanceof ConsecutiveFailureError) return 'network';
  if (e instanceof WikiApiError) {
    if (e.rateLimited) return 'ratelimit';
    if (e.network) return navigator.onLine ? 'network' : 'offline';
    return 'network';
  }
  return 'other';
}
