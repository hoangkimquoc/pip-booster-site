/**
 * platform-netflix.js — Hợp đồng nền tảng cho Netflix (trình phát /watch/).
 *
 * Spike 2026-10-05: chuyển <video> (DRM Widevine) vào Document PiP vẫn CÓ HÌNH,
 * phát tiếp bình thường; Netflix vẫn vẽ phụ đề .player-timedtext trong trang gốc
 * → subtitle-mirror chép sang. Khung phụ đề bị ẩn (display:none) khi không có
 * thoại — không phải lỗi.
 * Phụ đề trong cửa sổ nổi = tính năng PRO (nỗi đau có người sẵn sàng trả tiền).
 */

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
  // Tập kế: nút của Netflix chỉ hiện khi rê chuột; không có thì PiP giữ nguyên tập đang xem
  nextSelectors: ['[data-uia="control-next"]'],
  prevSelectors: [],
  findVisibleAd: () => null,
  subtitles: {
    selector: '.player-timedtext',
    root: () => document.body,
    pro: true,
  },
  features: {
    score: false, autoNext: false, skipAds: false, skipBoring: false,
    reelActions: false, movieLookup: false, partLinks: false,
  },
};
