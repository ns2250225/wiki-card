import { defineStore } from 'pinia';
import type { OwnedCard, PackHistory } from '@/types';
import { computeStats, getAllCards, getPackHistory } from '@/services/collection/collectionService';

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    cards: [] as OwnedCard[],
    history: [] as PackHistory[],
    loaded: false,
    loading: false,
  }),
  getters: {
    owned: (s) => s.cards.filter((c) => c.count > 0),
    seenOnly: (s) => s.cards.filter((c) => c.count === 0),
    stats: (s) => computeStats(s.cards),
    recent: (s) =>
      s.cards
        .filter((c) => c.count > 0)
        .sort((a, b) => b.lastObtainedAt - a.lastObtainedAt)
        .slice(0, 8),
    categories: (s) => [...new Set(s.cards.map((c) => c.category))].sort(),
    byId: (s) => new Map(s.cards.map((c) => [c.id, c])),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      this.loading = true;
      try {
        const [cards, history] = await Promise.all([getAllCards(), getPackHistory()]);
        this.cards = cards;
        this.history = history;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
    refresh() {
      return this.load(true);
    },
  },
});
