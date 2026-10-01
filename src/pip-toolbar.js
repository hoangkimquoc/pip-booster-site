/**
 * pip-toolbar.js — Lắp toolbar điều khiển cho PiP window và Cinema.
 *
 * Hàng 1 (phát):      [prev] -10s · play · +10s [next] · · · volume · đóng
 * Hàng 2 (hành động): tốc độ [size] · phụ đề · quan tâm/không · · · score · [tải] · tra phim
 * Container query (pip-styles.js) thu gọn khi hẹp, gộp 1 hàng khi rộng (cinema).
 *
 * Vòng đời: listener gắn lên video/document dùng chung một AbortController.
 * Luôn gắn/gỡ qua attachToolbar() → hàm gỡ trả về sẽ dispose (gỡ listener, dừng
 * bản ghi download) — bắt buộc khi chuyển reel hoặc đóng, tránh rò listener.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { anchorMenu, makeBtn, showProGateMessage } from './toolbar-dom-helpers.js';
import { PRODUCT_CONFIG } from './product-config.js';
import { buildProgressBar } from './toolbar-progress-bar.js';
import { buildScoreBadge } from './toolbar-score-badge.js';
import { buildMovieLookup } from './toolbar-movie-panel.js';
import { buildReelActionControls } from './toolbar-reel-actions.js';
import { enableTapToToggle } from './toolbar-tap-toggle.js';
import { buildDownloadButton } from './toolbar-download-button.js';
import { track } from './analytics.js';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const SEEK_STEP_S = 10;
const UNMUTE_DEFAULT_VOLUME = 0.5;

/** Preset tỉ lệ/size cửa sổ — bấm để resizeTo nhanh (khỏi kéo góc). */
const SIZE_PRESETS = [
  { key: 'size_portrait', w: 360, h: 640 },
  { key: 'size_square', w: 440, h: 440 },
  { key: 'size_landscape', w: 560, h: 315 },
];

/**
 * Tạo toolbar. Gắn vào khung bằng attachToolbar().
 * @param {HTMLVideoElement} video - video gốc từ Facebook
 * @param {{ document: Document, close: Function, resizeTo?: Function }} host - PiP window (hoặc giả lập của Cinema)
 * @param {{ isPro?: boolean, reelContainer?: Element, showSize?: boolean, onNav?: Function|null }} opts
 */
export function buildToolbar(video, host, opts = {}) {
  const { isPro = false, reelContainer = document.body, showSize = true, onNav = null } = opts;
  const doc = host.document;
  const lifetime = new AbortController();
  const listen = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal: lifetime.signal });

  const toolbar = doc.createElement('div');
  toolbar.id = 'pip-toolbar';
  toolbar.appendChild(buildProgressBar(doc, video, listen));

  // --- Menu nổi: mở cái này thì đóng các cái khác ---
  const menus = [];
  const closeMenus = (except) => menus.forEach((m) => { if (m !== except) m.classList.remove('open'); });
  const toggleMenu = (menu, btn) => {
    const willOpen = !menu.classList.contains('open');
    closeMenus();
    if (willOpen) {
      menu.classList.add('open');
      anchorMenu(menu, btn);
    }
  };
  const bindMenu = (btn, menu) => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(menu, btn);
  });

  const playback = buildPlaybackButtons(doc, video, onNav, listen);
  const volume = buildVolumeControl(doc, video, listen);
  const speed = buildSpeedControl(doc, video);
  const size = showSize ? buildSizeControl(doc, host) : null;
  const score = buildScoreBadge(doc, reelContainer);
  // Bản Chrome Web Store: không có tải video (module bị loại khỏi bundle →
  // chỉ tham chiếu buildDownloadButton khi cờ bật).
  const download = PRODUCT_CONFIG.features.download ? buildDownloadButton(doc, video) : null;
  const movie = buildMovieLookup(doc, { isPro, reelContainer });
  const reelActions = buildReelActionControls(doc, { video, onNav, closeMenus });

  menus.push(speed.menu, score.breakdownEl, reelActions.ccMenu);
  bindMenu(speed.button, speed.menu);
  if (size) {
    menus.push(size.menu);
    bindMenu(size.button, size.menu);
  }
  score.badge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPro) { toggleMenu(score.breakdownEl, score.badge); return; }
    closeMenus();
    showProGateMessage(score.breakdownEl, 'score');
    anchorMenu(score.breakdownEl, score.badge);
  });

  const btnClose = makeBtn(doc, icons.x(), t('close'));
  btnClose.classList.add('tb-close');
  btnClose.addEventListener('click', () => host.close());

  const row1 = makeRow(doc, [...playback, spacer(doc), volume, btnClose]);
  const row2 = makeRow(doc, [
    speed.button, size && size.button, ...reelActions.buttons,
    spacer(doc), score.badge, download && download.button, movie.button,
  ]);

  // 2 hàng trong 1 khung → CSS gộp thành 1 hàng khi toolbar rộng
  const rows = doc.createElement('div');
  rows.className = 'toolbar-rows';
  rows.append(row1, row2);
  toolbar.appendChild(rows);

  listen(doc, 'click', () => closeMenus());

  const closeOpenMenus = () => {
    const anyOpen = menus.some((m) => m.classList.contains('open'));
    closeMenus();
    return anyOpen;
  };
  const tapFlash = enableTapToToggle(doc, video, listen, closeOpenMenus);

  // Panel/menu nổi nằm ngoài toolbar (con trực tiếp của wrapper) để định vị tự do
  toolbar._overlays = [...menus, movie.panel, tapFlash];
  toolbar._dispose = () => {
    lifetime.abort();
    download?.stop();
  };
  return toolbar;
}

/**
 * Gắn toolbar + các panel nổi vào wrapper.
 * @returns {() => void} hàm gỡ: dispose + xoá khỏi DOM
 */
export function attachToolbar(wrapper, toolbar) {
  wrapper.appendChild(toolbar);
  toolbar._overlays.forEach((el) => wrapper.appendChild(el));
  return () => {
    toolbar._dispose();
    [toolbar, ...toolbar._overlays].forEach((el) => el.remove());
  };
}

// ---------------------------------------------------------------------------
// Các cụm điều khiển
// ---------------------------------------------------------------------------

function spacer(doc) {
  const el = doc.createElement('div');
  el.className = 'spacer';
  return el;
}

function makeRow(doc, kids) {
  const row = doc.createElement('div');
  row.className = 'toolbar-row';
  row.append(...kids.filter(Boolean));
  return row;
}

/** [prev] · -10s · play/pause · +10s · [next] — prev/next chỉ khi có onNav. */
function buildPlaybackButtons(doc, video, onNav, listen) {
  const btnPlayPause = makeBtn(doc, video.paused ? icons.play() : icons.pause(), t('play_pause'));
  btnPlayPause.id = 'btn-playpause';
  btnPlayPause.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  listen(video, 'play', () => { btnPlayPause.innerHTML = icons.pause(); });
  listen(video, 'pause', () => { btnPlayPause.innerHTML = icons.play(); });

  const btnRewind = makeBtn(doc, icons.arrowCounterClockwise(), t('rewind'));
  btnRewind.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - SEEK_STEP_S);
  });

  const btnForward = makeBtn(doc, icons.arrowClockwise(), t('forward'));
  btnForward.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + SEEK_STEP_S);
  });

  if (typeof onNav !== 'function') return [btnRewind, btnPlayPause, btnForward];

  const btnPrev = makeBtn(doc, icons.skipBack(), t('prev_video'));
  const nav = (direction) => {
    track('reel_navigated', { direction });
    onNav(direction);
  };
  btnPrev.addEventListener('click', () => nav('prev'));
  const btnNext = makeBtn(doc, icons.skipForward(), t('next_video'));
  btnNext.addEventListener('click', () => nav('next'));
  return [btnPrev, btnRewind, btnPlayPause, btnForward, btnNext];
}

/** Nút tắt/bật tiếng + slider âm lượng. */
function buildVolumeControl(doc, video, listen) {
  const wrap = doc.createElement('div');
  wrap.className = 'vol-wrap';
  const btn = makeBtn(doc, video.muted ? icons.speakerSlash() : icons.speakerHigh(), t('volume'));
  const slider = doc.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.05';
  slider.className = 'vol-slider';

  const sync = () => {
    const silent = video.muted || video.volume === 0;
    btn.innerHTML = silent ? icons.speakerSlash() : icons.speakerHigh();
    slider.value = String(video.muted ? 0 : video.volume);
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = UNMUTE_DEFAULT_VOLUME;
    sync();
  });
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    video.volume = v;
    video.muted = v === 0;
    sync();
  });
  listen(video, 'volumechange', sync);
  sync();

  wrap.append(btn, slider);
  return wrap;
}

/** Nút tốc độ (kèm nhãn tốc độ hiện tại) + menu chọn. */
function buildSpeedControl(doc, video) {
  const button = makeBtn(doc, icons.gauge() + '<span class="speed-label">1x</span>', t('speed'));
  button.id = 'btn-speed';

  const menu = doc.createElement('div');
  menu.id = 'speed-menu';
  for (const s of SPEEDS) {
    const opt = doc.createElement('button');
    opt.className = 'speed-opt' + (s === 1 ? ' active' : '');
    opt.textContent = `${s}x`;
    opt.addEventListener('click', () => {
      video.playbackRate = s;
      menu.querySelectorAll('.speed-opt').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      menu.classList.remove('open');
      button.dataset.tip = `${t('speed')}: ${s}x`;
      const lbl = button.querySelector('.speed-label');
      if (lbl) lbl.textContent = `${s}x`;
    });
    menu.appendChild(opt);
  }
  return { button, menu };
}

/** Preset kích thước cửa sổ PiP (Cinema không dùng — overlay full màn hình). */
function buildSizeControl(doc, host) {
  const button = makeBtn(doc, icons.frameCorners(), t('size'));
  button.classList.add('tb-size');

  const menu = doc.createElement('div');
  menu.id = 'size-menu';
  for (const p of SIZE_PRESETS) {
    const opt = doc.createElement('button');
    opt.className = 'size-opt';
    opt.textContent = t(p.key);
    opt.addEventListener('click', () => {
      try { host.resizeTo(p.w, p.h); } catch { /* noop */ }
      menu.querySelectorAll('.size-opt').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      menu.classList.remove('open');
    });
    menu.appendChild(opt);
  }
  return { button, menu };
}
