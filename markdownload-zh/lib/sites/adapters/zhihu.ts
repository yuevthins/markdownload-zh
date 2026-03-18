/**
 * 知乎适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

export const zhihuAdapter: SiteAdapter = {
  id: 'zhihu',
  match: 'zhihu.com',
  siteName: '知乎',

  removeSelectors: [
    '.RecommendationColumn', '.HotAnswers', '.AdCard',
    '.RichContent-actions', '.ContentItem-actions', '.Reward',
    '.FollowButton', '.VoteButton', '.ShareMenu',
    '.Comments-container', '.Post-topicsAndReviewer',
    '.Question-sideColumn', '.Sticky', '.CornerAnimay498', '.CornerBubble',
  ],

  fallbackSelectors: [
    '.RichContent-inner', '.Post-RichText', '.RichText', '.ztext',
  ],
};
