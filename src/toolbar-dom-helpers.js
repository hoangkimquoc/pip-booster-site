/**
 * toolbar-dom-helpers.js — Helper DOM nhỏ dùng chung cho các phần của toolbar.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { track } from './analytics.js';

/** Khoảng cách tối thiểu giữa menu nổi và mép khung. */
const MENU_EDGE_GAP_PX = 4;
const MENU_ABOVE_BTN_PX = 8;

/** Nút icon chuẩn của toolbar (tooltip tuỳ biến qua data-tip). */
export function makeBtn(doc, svgHtml, tip = '') {
  const btn = doc.createElement('button');
  btn.className = 'pip-btn';
  btn.innerHTML = svgHtml;
  btn.dataset.tip = tip;
  return btn;
}

/** Nút có chữ (icon + nhãn). */
export function makeWideBtn(doc, html) {
  const btn = makeBtn(doc, html);
  btn.classList.add('pip-btn-wide');
  return btn;
}

/**
 * Đặt menu ngay phía trên nút mở nó, kẹp trong wrapper (nút sát mép phải →
 * menu lùi sang trái, không tràn khỏi cửa sổ).
 */
export function anchorMenu(menu, btn) {
  const wrap = menu.parentElement;
  if (!wrap || typeof btn.getBoundingClientRect !== 'function') return;
  const b = btn.getBoundingClientRect();
  const w = wrap.getBoundingClientRect();
  const maxLeft = Math.max(MENU_EDGE_GAP_PX, w.width - menu.offsetWidth - MENU_EDGE_GAP_PX);
  menu.style.left = `${Math.min(Math.max(MENU_EDGE_GAP_PX, b.left - w.left), maxLeft)}px`;
  menu.style.right = 'auto';
  menu.style.transform = 'none';
  menu.style.bottom = `${w.bottom - b.top + MENU_ABOVE_BTN_PX}px`;
}

/** Nội dung "Tính năng PRO" cho panel/menu bị khóa (ghi nhận lượt thấy paywall). */
export function showProGateMessage(container, feature) {
  track('paywall_viewed', { feature });
  container.classList.add('open');
  container.innerHTML = `
    <div class="pro-gate">
      ${icons.lockSimple(24)}
      <div class="pro-gate-title">${t('pro_feature')}</div>
      <div>${t('pro_unlock')}</div>
    </div>
  `;
}

/** Giây → m:ss */
export function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
