/**
 * demo.js — Cửa sổ PiP chạy THẬT trong hero: video thật + toolbar thật của
 * extension (module copy nguyên từ src/ khi build site).
 *
 * Khác extension: next/prev đổi giữa các clip demo; resize = đổi khung trên
 * trang; các nút cần trang Facebook (CC, Interested, Find movie...) hiện ghi chú
 * thay vì chạy.
 *
 * Player nằm trong Shadow DOM (như Cinema mode trên Facebook): PIP_STYLES có
 * quy tắc toàn cục (*, body…) không được rò ra làm hỏng layout landing page.
 */

import { attachToolbar, buildToolbar } from './src/pip-toolbar.js';
import { PIP_STYLES } from './src/pip-styles.js';
import { PRODUCT_CONFIG } from './src/product-config.js';
import { t } from './src/i18n.js';

PRODUCT_CONFIG.features.download = false;

const CLIPS = [
  { src: 'media/clip-1.mp4', score: { score: 8, stats: { views: null, likes: 11800, comments: 236, shares: 1100 } } },
  { src: 'media/clip-2.mp4', score: { score: 6, stats: { views: null, likes: 4200, comments: 88, shares: 160 } } },
  { src: 'media/clip-3.mp4', score: { score: 9, stats: { views: null, likes: 25400, comments: 910, shares: 3800 } } },
];
/** Nút chỉ chạy được trên facebook.com (nhận diện qua tooltip). */
const FB_ONLY_TIPS = new Set([t('captions'), t('interested'), t('not_interested'), t('movie_lookup'), t('pro_tooltip')]);
const NOTE_MS = 1800;

const win = document.getElementById('demo-pip');
const frame = win.querySelector('.demo-frame');
const note = win.querySelector('.demo-note');
const reopen = document.getElementById('demo-reopen');

const DEMO_CSS = `
  :host { all: initial; position: absolute; inset: 0; font-family: Inter, -apple-system, 'Segoe UI', sans-serif; }
  #pip-wrapper { position: absolute; inset: 0; }
  video { width: 100%; height: 100%; object-fit: cover; }
  :host(.reveal) #pip-toolbar { opacity: 1; }
`;
const shadow = frame.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = PIP_STYLES + DEMO_CSS;
shadow.appendChild(style);

let index = 0;
let detach = null;
let noteTimer = null;

const wrapper = document.createElement('div');
wrapper.id = 'pip-wrapper';
shadow.appendChild(wrapper);

const video = document.createElement('video');
video.muted = true;
video.loop = true;
video.playsInline = true;
video.autoplay = true;
wrapper.appendChild(video);

function showNote(text) {
  note.textContent = text;
  note.classList.add('show');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => note.classList.remove('show'), NOTE_MS);
}

const host = {
  document,
  close() {
    video.pause();
    win.classList.add('closed');
    reopen.hidden = false;
  },
  /** Preset kích thước của extension → đổi tỉ lệ khung demo. */
  resizeTo(w, h) {
    win.style.aspectRatio = `${w} / ${h}`;
  },
};

function mount(i) {
  index = (i + CLIPS.length) % CLIPS.length;
  const clip = CLIPS[index];
  detach?.();
  video.src = clip.src;
  video.play().catch(() => {});
  const reel = { __quickScore: clip.score, querySelectorAll: () => [], querySelector: () => null, closest: () => null };
  const toolbar = buildToolbar(video, host, {
    isPro: true,
    reelContainer: reel,
    onNav: (dir) => mount(index + (dir === 'next' ? 1 : -1)),
  });
  detach = attachToolbar(wrapper, toolbar);
}

// Chặn các nút cần Facebook trước khi toolbar xử lý (capture phase)
wrapper.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tip]');
  if (!btn || !FB_ONLY_TIPS.has(btn.dataset.tip)) return;
  e.stopPropagation();
  e.preventDefault();
  showNote('Works on facebook.com reels');
}, true);

reopen.addEventListener('click', () => {
  win.classList.remove('closed');
  reopen.hidden = true;
  video.play().catch(() => {});
});

// Kéo cửa sổ bằng thanh tiêu đề (như cửa sổ PiP thật)
const bar = win.querySelector('.demo-titlebar');
bar.addEventListener('pointerdown', (e) => {
  const stage = win.parentElement.getBoundingClientRect();
  const start = win.getBoundingClientRect();
  const dx = e.clientX - start.left;
  const dy = e.clientY - start.top;
  bar.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const x = Math.min(Math.max(ev.clientX - stage.left - dx, 0), stage.width - start.width);
    const y = Math.min(Math.max(ev.clientY - stage.top - dy, 0), stage.height - start.height);
    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  };
  const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', up);
});

mount(0);
// Hiện toolbar vài giây đầu để người xem biết có thể điều khiển
frame.classList.add('reveal');
setTimeout(() => frame.classList.remove('reveal'), 4500);
