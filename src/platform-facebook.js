/**
 * platform-facebook.js — Hợp đồng nền tảng cho Facebook (Reels, feed, watch).
 * Selector chi tiết vẫn nằm ở fb-adapter.js; file này chỉ khai báo nền tảng hỗ trợ gì.
 */

import { findReelContainers, findVideoInReel, parseEngagementStats } from './fb-adapter.js';
import { elInViewport } from './reel-nav.js';

const FB_AD_RE = /^(được tài trợ|sponsored)$/i;
const FB_AD_LABEL_MAX_LEN = 16;

/** Nhãn "Được tài trợ" đang hiển thị = reel quảng cáo đang xem. */
function findVisibleFacebookAd() {
  for (const el of document.querySelectorAll('a, span, div[role="button"]')) {
    const txt = (el.textContent || '').trim();
    if (txt.length <= FB_AD_LABEL_MAX_LEN && FB_AD_RE.test(txt) && elInViewport(el)) return el;
  }
  return null;
}

export const facebookPlatform = {
  id: 'facebook',
  matches: (host) => /(^|\.)facebook\.com$/.test(host),
  findContainers: findReelContainers,
  findVideo: findVideoInReel,
  getStats: parseEngagementStats,
  // Trang reel có nhiều cặp nút ("Mục tiếp theo" = carousel khác, "Thẻ tiếp theo"
  // = chuyển reel thật) → nhãn "card/thẻ" ưu tiên trước, chung chung sau.
  nextSelectors: [
    '[aria-label*="thẻ tiếp theo" i], [aria-label*="next card" i]',
    '[aria-label*="tiếp theo" i], [aria-label*="next" i]',
  ],
  prevSelectors: [
    '[aria-label*="thẻ trước" i], [aria-label*="previous card" i]',
    '[aria-label*="trước đó" i], [aria-label*="previous" i]',
  ],
  findVisibleAd: findVisibleFacebookAd,
  subtitles: null, // phụ đề FB nằm trong luồng/menu riêng (toolbar-reel-actions)
  features: {
    score: true, autoNext: true, skipAds: true, skipBoring: true,
    reelActions: true, movieLookup: true, partLinks: true,
  },
};
