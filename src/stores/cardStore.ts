import { defineStore } from 'pinia';
import type { ImageLicenseInfo, OwnedCard, WikiLanguageLink, WikiPageDetail } from '@/types';
import { getCard, updateCard } from '@/services/collection/collectionService';
import { getArticleDetail, getArticleHtml, getLanguageLinks } from '@/services/wikipedia/page';
import { getImageLicense } from '@/services/wikipedia/commons';
import { extractFromHtml, type ArticleExtras } from '@/services/card/factExtractor';
import { describeError } from '@/services/wikipedia/client';

export interface CardExtras {
  loading: boolean;
  error?: string;
  extras?: ArticleExtras;
  detail?: WikiPageDetail;
  languages?: WikiLanguageLink[];
  imageLicense?: ImageLicenseInfo;
}

export const useCardStore = defineStore('card', {
  state: () => ({
    extras: {} as Record<string, CardExtras>,
  }),
  actions: {
    getCard(id: string): Promise<OwnedCard | undefined> {
      return getCard(id);
    },
    /**
     * 卡牌详情扩展知识：完整 HTML 只在需要补充详情时请求。
     * 每项独立失败，不影响其他内容。
     */
    async loadExtras(card: OwnedCard) {
      if (this.extras[card.id]?.loading || this.extras[card.id]?.extras) return;
      this.extras[card.id] = { loading: true };
      const lang = card.wikiLanguage;
      const [html, detail, languages, license] = await Promise.allSettled([
        getArticleHtml(card.title, lang),
        getArticleDetail(card.title, lang),
        getLanguageLinks(card.title, lang),
        card.originalImageUrl || card.imageUrl
          ? getImageLicense((card.originalImageUrl || card.imageUrl)!, lang)
          : Promise.resolve(undefined),
      ]);
      const entry: CardExtras = { loading: false };
      if (html.status === 'fulfilled') {
        try {
          entry.extras = extractFromHtml(html.value);
        } catch {
          /* ignore */
        }
      } else {
        entry.error = describeError(html.reason);
      }
      if (detail.status === 'fulfilled') entry.detail = detail.value;
      if (languages.status === 'fulfilled') entry.languages = languages.value;
      if (license.status === 'fulfilled') entry.imageLicense = license.value;
      this.extras[card.id] = entry;

      // 保存版本及许可信息到本地卡牌
      const patch: Partial<OwnedCard> = {};
      if (entry.detail?.latest?.id && card.count > 0) patch.revisionId = entry.detail.latest.id;
      if (entry.detail?.license?.title) patch.sourceLicense = entry.detail.license.title;
      if (entry.imageLicense?.license) patch.imageLicense = entry.imageLicense.license;
      if (Object.keys(patch).length) await updateCard(card.id, patch).catch(() => undefined);
    },
  },
});
