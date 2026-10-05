/**
 * toolbar-ab-loop.js — PRO: lặp một đoạn A-B (học ngoại ngữ, tập nhạc, xem lại
 * một thao tác trong tutorial).
 *   Bấm 1: đặt A tại vị trí hiện tại · Bấm 2: đặt B, bắt đầu lặp · Bấm 3: tắt.
 * Free: nút khoá, bấm hiện thông báo PRO.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { formatTime, makeBtn, showProGateMessage, anchorMenu } from './toolbar-dom-helpers.js';
import { track } from './analytics.js';
import { seekVideo } from './video-control.js';

/** B phải sau A ít nhất chừng này giây (tránh lặp đoạn rỗng). */
const MIN_LOOP_S = 1;

/** Bước trạng thái kế tiếp khi bấm nút. Trả state mới. */
export function nextAbState(state, now) {
  if (state.a === null) return { a: now, b: null };
  if (state.b === null) return now - state.a >= MIN_LOOP_S ? { a: state.a, b: now } : state;
  return { a: null, b: null };
}

/**
 * @param {Document} doc
 * @param {{ video: HTMLVideoElement, isPro: boolean, listen: Function }} ctx
 * @returns {{ button: HTMLElement, menu: HTMLElement }} menu = chỗ hiện thông báo PRO
 */
export function buildAbLoop(doc, { video, isPro, listen }) {
  const button = makeBtn(doc, '<span class="ab-label">A-B</span>', t('ab_loop'));
  button.classList.add('ab-loop');
  const gate = doc.createElement('div');
  gate.id = 'ab-gate';
  gate.className = 'pb-menu';

  if (!isPro) {
    button.classList.add('pro-locked');
    button.innerHTML = '<span class="ab-label">A-B</span>' + icons.lockSimple(10);
    button.dataset.tip = t('pro_tooltip');
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      showProGateMessage(gate, 'ab_loop');
      anchorMenu(gate, button);
    });
    return { button, menu: gate };
  }

  let state = { a: null, b: null };
  const label = button.querySelector('.ab-label');
  const render = () => {
    button.classList.toggle('active', state.a !== null);
    if (state.a === null) {
      label.textContent = 'A-B';
      button.dataset.tip = t('ab_loop');
    } else if (state.b === null) {
      label.textContent = 'A→';
      button.dataset.tip = t('ab_set_b', { a: formatTime(state.a) });
    } else {
      label.textContent = 'A⇄B';
      button.dataset.tip = t('ab_active', { a: formatTime(state.a), b: formatTime(state.b) });
    }
  };

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    state = nextAbState(state, video.currentTime);
    if (state.b !== null) track('yt_tool_used', { feature: 'ab_loop' });
    render();
  });
  // Lặp: tới B → về A. Sang video khác (src đổi) → tắt.
  listen(video, 'timeupdate', () => {
    if (state.b !== null && video.currentTime >= state.b) seekVideo(video, state.a);
  });
  listen(video, 'loadedmetadata', () => { state = { a: null, b: null }; render(); });
  render();
  return { button, menu: gate };
}
