/**
 * fb-reel-menu.js — Tự động hóa menu "..." của reel FB đang xem.
 *
 * Khi video đã ở PiP/Cinema, user không bấm được menu FB trên trang nữa →
 * extension mở menu hộ, bấm item theo nhãn (vi/en), đọc submenu phụ đề.
 * Nhãn lấy từ DOM thật (menu reel 2026-09): Quan tâm, Không quan tâm,
 * Phụ đề và bản dịch. Nhãn tiếng Anh là phỏng đoán — sai thì chỉ log, không crash.
 */

import { pipLog } from './debug-log.js';
import { elInViewport, waitMs } from './reel-nav.js';

const MENU_BTN_LABELS = ['menu', 'more', 'xem thêm'];
const ITEM_ROLES = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="radio"], [role="switch"], [role="checkbox"]';
const BACK_RE = /quay lại|back/i;
const POLL_STEP_MS = 50;
const POLL_TIMEOUT_MS = 1500;
const CLOSE_AFTER_SELECT_MS = 150;

/**
 * Chỉ 1 menu FB mở được tại một thời điểm → mọi thao tác xếp hàng tuần tự
 * (bấm CC khi Quan tâm chưa xong không làm 2 lượt mở menu đan xen, bấm nhầm item).
 */
let menuQueue = Promise.resolve();
function serial(task) {
  const run = menuQueue.then(task, task);
  menuQueue = run.catch(() => {});
  return run;
}

export const REEL_ACTION_LABELS = {
  interested: ['quan tâm', 'interested'],
  notInterested: ['không quan tâm', 'not interested'],
  captions: ['phụ đề và bản dịch', 'phụ đề', 'captions and translations', 'captions'],
};

/** Nút "..." của reel đang xem = nút Menu hiển thị gần tâm màn hình nhất. */
function findReelMenuButton() {
  const midY = window.innerHeight / 2;
  let best = null;
  let bestDist = Infinity;
  for (const b of document.querySelectorAll('[role="button"][aria-label]')) {
    const label = b.getAttribute('aria-label').trim().toLowerCase();
    if (!MENU_BTN_LABELS.includes(label) || !elInViewport(b)) continue;
    const r = b.getBoundingClientRect();
    const dist = Math.abs(r.top + r.height / 2 - midY);
    if (dist < bestDist) { bestDist = dist; best = b; }
  }
  return best;
}

function visibleMenu() {
  for (const m of document.querySelectorAll('[role="menu"]')) {
    if (elInViewport(m)) return m;
  }
  return null;
}

/** Chờ điều kiện đúng (poll 50ms), hết hạn trả null. */
async function pollFor(fn, timeoutMs = POLL_TIMEOUT_MS) {
  for (let waited = 0; waited <= timeoutMs; waited += POLL_STEP_MS) {
    const v = fn();
    if (v) return v;
    await waitMs(POLL_STEP_MS);
  }
  return null;
}

/** Nhãn hiển thị của item = dòng đầu innerText. */
function itemLabel(el) {
  return (el.innerText || el.getAttribute('aria-label') || '').split('\n')[0].trim();
}

function menuItems(menu) {
  return [...menu.querySelectorAll(ITEM_ROLES)].filter((el) => itemLabel(el));
}

/** Khớp nhãn CHÍNH XÁC (tránh "quan tâm" khớp nhầm "không quan tâm"). */
function findItem(menu, labels) {
  return menuItems(menu).find((el) => labels.includes(itemLabel(el).toLowerCase())) || null;
}

/** Nút "..." vừa dùng để mở menu — bấm lại để gập menu. */
let lastMenuButton = null;

/**
 * Đóng menu FB đang mở. Ưu tiên bấm lại nút "..." (toggle). Chỉ khi không được
 * mới gửi Escape VÀO CHÍNH menu — gửi lên document có thể khiến FB đóng luôn
 * trình xem reel.
 */
function closeFbMenu() {
  if (!visibleMenu()) return;
  if (lastMenuButton && lastMenuButton.isConnected) lastMenuButton.click();
  const menu = visibleMenu();
  if (menu) menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: false }));
}

async function openReelMenu() {
  const btn = findReelMenuButton();
  if (!btn) { pipLog('fbMenu: không thấy nút ... của reel'); return null; }
  lastMenuButton = btn;
  btn.click();
  const menu = await pollFor(visibleMenu);
  if (!menu) pipLog('fbMenu: bấm ... nhưng menu không mở');
  return menu;
}

/** Mở menu reel → bấm item theo nhãn. Trả true nếu bấm được. */
export function runReelMenuAction(labels) {
  return serial(() => doReelMenuAction(labels));
}

async function doReelMenuAction(labels) {
  const menu = await openReelMenu();
  if (!menu) return false;
  const item = findItem(menu, labels);
  if (!item) {
    pipLog('fbMenu: không thấy item', { want: labels, have: menuItems(menu).map(itemLabel) });
    closeFbMenu();
    return false;
  }
  item.click();
  pipLog('fbMenu: đã bấm ' + itemLabel(item));
  return true;
}

/** Mở submenu phụ đề; trả menu đang hiện (đã chuyển sang submenu) hoặc null. */
async function openCaptionsSubmenu() {
  const menu = await openReelMenu();
  if (!menu) return null;
  const item = findItem(menu, REEL_ACTION_LABELS.captions);
  if (!item) {
    pipLog('fbMenu: không thấy mục phụ đề', { have: menuItems(menu).map(itemLabel) });
    closeFbMenu();
    return null;
  }
  const before = itemLabel(item);
  item.click();
  // Submenu thay nội dung menu cũ (hoặc mở menu mới) → chờ danh sách nhãn đổi.
  return pollFor(() => {
    const m = visibleMenu();
    if (!m) return null;
    const labels = menuItems(m).map(itemLabel);
    return labels.length && !labels.includes(before) ? m : null;
  });
}

function captionOptionsOf(menu) {
  return menuItems(menu)
    .filter((el) => !BACK_RE.test(itemLabel(el)) && !BACK_RE.test(el.getAttribute('aria-label') || ''))
    .map((el) => ({ label: itemLabel(el), checked: el.getAttribute('aria-checked') === 'true' }));
}

/** Đọc các lựa chọn phụ đề (Tắt / ngôn ngữ...) rồi đóng menu. */
export function getCaptionOptions(video) {
  return serial(() => readCaptionOptions(video));
}

async function readCaptionOptions(video) {
  const sub = await openCaptionsSubmenu();
  const opts = sub ? captionOptionsOf(sub) : [];
  pipLog('captions: options', {
    opts,
    textTracks: video && video.textTracks ? video.textTracks.length : 'n/a',
  });
  closeFbMenu();
  return opts;
}

/** Chọn 1 lựa chọn phụ đề theo nhãn. */
export function selectCaptionOption(label) {
  return serial(() => clickCaptionOption(label));
}

async function clickCaptionOption(label) {
  const sub = await openCaptionsSubmenu();
  if (!sub) return false;
  const item = findItem(sub, [label.toLowerCase()]);
  if (!item) { closeFbMenu(); return false; }
  item.click();
  await waitMs(CLOSE_AFTER_SELECT_MS);
  if (visibleMenu()) closeFbMenu();
  pipLog('captions: chọn ' + label);
  return true;
}
