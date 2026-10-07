/**
 * platform-netflix.js — Hợp đồng nền tảng cho Netflix (trình phát /watch/).
 *
 * Spike 2026-10-05: chuyển <video> (DRM Widevine) vào Document PiP vẫn CÓ HÌNH,
 * phát tiếp bình thường; Netflix vẫn vẽ phụ đề .player-timedtext trong trang gốc
 * → subtitle-mirror chép sang. Khung phụ đề bị ẩn (display:none) khi không có
 * thoại — không phải lỗi.
 * Phụ đề trong cửa sổ nổi = tính năng PRO (nỗi đau có người sẵn sàng trả tiền).
 */

import { pageCall } from './page-bridge.js';

/** Lỗi bridge (chưa nạp / không ở trang phát) → bỏ qua, không làm vỡ toolbar. */
const fireAndForget = (cmd, ...args) => { pageCall(cmd, ...args).catch(() => {}); };

function findNetflixContainers() {
  const video = document.querySelector('video');
  if (!video) return [];
  const player = video.closest('[data-uia="watch-video"], .watch-video--player-view, .watch-video') || video.parentElement;
  return player ? [player] : [];
}

export const netflixPlatform = {
  id: 'netflix',
  matches: (host) => /(^|\.)netflix\.com$/.test(host),
  findContainers: findNetflixContainers,
  findVideo: (container) => container.querySelector('video'),
  getStats: () => ({ views: null, likes: null, comments: null, shares: null }),
  nextSelectors: [],
  prevSelectors: [],
  // Netflix cấm gán thẳng <video>.currentTime (lỗi M7375) → mọi thao tác qua API trình phát (nf-main-bridge)
  seek: (video, sec) => fireAndForget('seek', sec),
  setRate: (video, rate) => fireAndForget('setRate', rate),
  /** Next = tập kế (API Netflix, cùng <video> nên PiP giữ nguyên). Prev = xem lại từ đầu tập. */
  navigate(dir) {
    if (dir === 'next') fireAndForget('nextEpisode');
    else fireAndForget('seek', 0);
    return true;
  },
  findVisibleAd: () => null,
  subtitles: {
    selector: '.player-timedtext',
    root: () => document.body,
    pro: true,
  },
  features: {
    score: false, autoNext: false, skipAds: false, skipBoring: false,
    reelActions: false, movieLookup: false, partLinks: false,
    netflixTools: true, netflixAutoSkip: true,
    // Mỗi tập là một thẻ <video> mới → PiP/Cinema tự nhận thẻ mới (video-replace-watch)
    replacesVideo: true,
  },
};
