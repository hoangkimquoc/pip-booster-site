/**
 * platform-youtube.js — Hợp đồng nền tảng cho YouTube (trang xem video + Shorts).
 *
 * - Trang xem: khung = #movie_player. YouTube tái dùng CÙNG <video> khi sang video
 *   kế (autoplay/playlist) → PiP đang mở tự phát video mới, không cần swap.
 * - Shorts: mỗi short là ytd-reel-video-renderer; nút lên/xuống của YouTube để chuyển.
 * - Phụ đề CC: YouTube vẫn vẽ .ytp-caption-segment trong #movie_player kể cả khi
 *   <video> đã sang cửa sổ PiP (spike 2026-10-05) → subtitle-mirror chép sang.
 */

const SHORTS_PATH_RE = /^\/shorts\//;

/** Số lần chính extension đã next (SPA) → prev chỉ lùi lịch sử trong phạm vi này, không thoát YouTube. */
let navDepth = 0;

/**
 * Next/prev trên trang xem video. Khi video đã sang PiP/Cinema, YouTube ẩn thanh
 * điều khiển (.ytp-next-button display:none) nên không dùng selector "đang hiển thị"
 * được. Bấm thẳng nút next (SPA, không reload — PiP giữ nguyên, cùng <video>);
 * prev = lùi lịch sử nếu trước đó mình đã next, không thì tua về đầu.
 * @returns {boolean} true nếu đã xử lý (Shorts → false để dùng nút lên/xuống)
 */
function navigateWatchPage(dir, video) {
  if (SHORTS_PATH_RE.test(location.pathname)) return false;
  if (dir === 'next') {
    const next = document.querySelector('.ytp-next-button');
    if (!next || !next.getAttribute('href')) return false;
    next.click();
    navDepth++;
    return true;
  }
  if (navDepth > 0) {
    navDepth--;
    history.back();
  } else if (video) {
    video.currentTime = 0;
  }
  return true;
}

function findYoutubeContainers() {
  const out = [];
  const player = document.querySelector('#movie_player');
  if (player && player.querySelector('video') && !SHORTS_PATH_RE.test(location.pathname)) out.push(player);
  for (const short of document.querySelectorAll('ytd-reel-video-renderer')) {
    if (short.querySelector('video')) out.push(short);
  }
  return out;
}

export const youtubePlatform = {
  id: 'youtube',
  matches: (host) => /(^|\.)youtube\.com$/.test(host),
  findContainers: findYoutubeContainers,
  findVideo: (container) => container.querySelector('video'),
  getStats: () => ({ views: null, likes: null, comments: null, shares: null }),
  nextSelectors: [
    '#navigation-button-down button, button[aria-label="Next video"]',
    '.ytp-next-button',
  ],
  prevSelectors: [
    '#navigation-button-up button, button[aria-label="Previous video"]',
    '.ytp-prev-button',
  ],
  navigate: navigateWatchPage,
  findVisibleAd: () => null,
  subtitles: {
    selector: '.ytp-caption-segment',
    root: () => document.querySelector('#movie_player') || document.body,
  },
  features: {
    score: false, autoNext: true, skipAds: false, skipBoring: false,
    reelActions: false, movieLookup: false, partLinks: false,
    youtubeTools: true, sponsorSkip: true, channelSpeed: true,
  },
};
