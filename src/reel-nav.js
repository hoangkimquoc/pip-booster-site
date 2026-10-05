/**
 * reel-nav.js — Điều hướng reel dùng chung (PiP, Cinema, auto-next, ad-skip).
 */

import { DEBUG, pipLog } from './debug-log.js';
import { getPlatform } from './platform.js';

/** Thời gian chờ FB render reel mới sau khi bấm next/prev. */
const REEL_SWAP_WAIT_MS = 700;
const QUALITY_RECHECK_MS = 5000;

/** Date.now an toàn (tránh lỗi nếu môi trường chặn). */
export function nowMs() {
  try { return Date.now(); } catch { return 0; }
}

/** Element đang hiển thị trong viewport (reel/nút đang xem). */
export function elInViewport(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false;
  const r = el.getBoundingClientRect();
  const vw = (typeof window !== 'undefined' && window.innerWidth) || 0;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 0;
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

// Selector nút next/prev theo nền tảng (platform-*.js), thử theo thứ tự ưu tiên.
function firstVisible(selectors) {
  for (const sel of selectors) {
    for (const b of document.querySelectorAll(sel)) {
      if (elInViewport(b)) return b;
    }
  }
  return null;
}

/** Nút "reel tiếp theo" đang hiển thị. */
export function findNextReelButton() {
  return firstVisible(getPlatform().nextSelectors);
}

/** Nút "reel trước đó" đang hiển thị. */
export function findPrevReelButton() {
  return firstVisible(getPlatform().prevSelectors);
}

// Player đang mở (PiP/Cinema) — video đã rời feed nên auto-next phải hỏi ở đây.
let activePlayer = null;

/** Đăng ký player đang mở: { owner, getVideo(), nav(dir) }. */
export function setActivePlayer(p) {
  activePlayer = p;
}

/** Gỡ player nếu đúng owner (tránh PiP gỡ nhầm của Cinema). */
export function clearActivePlayer(owner) {
  if (activePlayer && activePlayer.owner === owner) activePlayer = null;
}

export function getActivePlayer() {
  return activePlayer;
}

/** Chờ ms (dùng khi đợi reel mới load sau khi bấm next/prev). */
export function waitMs(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Chuyển sang reel kế. PiP/Cinema đang mở → dùng nav của player (swap luôn video
 * trong khung); không thì bấm nút FB trên trang. Dùng chung auto-next + ad-skip.
 */
export function goToNextReel(reason) {
  const player = getActivePlayer();
  if (player) {
    pipLog(reason + ': chuyển reel kế (' + player.owner + ')');
    player.nav('next');
    return true;
  }
  const navigate = getPlatform().navigate;
  if (typeof navigate === 'function' && navigate('next', null)) return true;
  const btn = findNextReelButton();
  pipLog(reason + ': chuyển reel kế', { foundBtn: !!btn });
  if (btn) btn.click();
  return !!btn;
}

/**
 * Bấm nút reel trước/kế của FB rồi lấy video reel mới.
 * @returns {Promise<HTMLVideoElement|null>} null nếu không có nút / FB chưa đổi reel
 */
export async function swapToAdjacentReel(dir, oldVideo) {
  // Nền tảng tự điều hướng (YouTube trang xem: cùng <video> phát nội dung mới) → không swap
  const navigate = getPlatform().navigate;
  if (typeof navigate === 'function' && navigate(dir, oldVideo)) {
    pipLog('reelSwap: platform navigate', { dir });
    return null;
  }
  const btn = dir === 'next' ? findNextReelButton() : findPrevReelButton();
  pipLog('reelSwap: click', { dir, foundBtn: !!btn });
  if (!btn) return null;
  btn.click();
  await waitMs(REEL_SWAP_WAIT_MS);
  // Nền tảng tái dùng CÙNG <video> (YouTube) → video trong PiP tự phát nội dung mới, không cần swap
  const nv = findVisibleVideo();
  pipLog('reelSwap: after', { foundVideo: !!nv, sameAsOld: nv === oldVideo });
  return nv && nv !== oldVideo ? nv : null;
}

/** Số tầng tối đa leo từ <video> lên khung reel. */
const MAX_REEL_ANCESTOR_LEVELS = 12;

/**
 * Khung reel chứa video = tổ tiên gần nhất đã được extension gắn điểm
 * (__quickScore) hoặc chèn nút (data-pipbooster-injected).
 * Phải gọi TRƯỚC khi chuyển video vào PiP/Cinema (lúc đó video còn trong trang).
 */
export function findReelOf(video) {
  let el = video;
  for (let i = 0; el && i < MAX_REEL_ANCESTOR_LEVELS; i++, el = el.parentElement) {
    if (el.__quickScore || (el.hasAttribute && el.hasAttribute('data-pipbooster-injected'))) return el;
  }
  return null;
}

/** Video reel đang xem = video lớn nhất trong viewport. */
export function findVisibleVideo() {
  let best = null;
  let bestArea = 0;
  for (const v of document.querySelectorAll('video')) {
    if (!elInViewport(v)) continue;
    const r = v.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea) {
      bestArea = area;
      best = v;
    }
  }
  return best;
}

/**
 * Chẩn đoán chất lượng: log độ phân giải thật của luồng (videoWidth×videoHeight)
 * so với kích thước khung hiển thị. Event 'resize' bắn khi FB đổi chất lượng (ABR).
 */
export function watchQuality(video, tag) {
  if (!DEBUG || !video) return;
  // Chỉ để chẩn đoán → lỗi ở đây không được làm hỏng PiP/Cinema.
  const snap = (why) => {
    try {
      const r = video.getBoundingClientRect();
      pipLog('quality[' + tag + '] ' + why, {
        stream: video.videoWidth + 'x' + video.videoHeight,
        box: Math.round(r.width) + 'x' + Math.round(r.height),
      });
    } catch { /* noop */ }
  };
  snap('open');
  setTimeout(() => snap('+5s'), QUALITY_RECHECK_MS);
  if (video.__pbQualWatch) return;
  video.__pbQualWatch = true;
  try { video.addEventListener('resize', () => snap('ABR switch')); } catch { /* noop */ }
}
