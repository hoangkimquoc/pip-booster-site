/**
 * toolbar-tap-toggle.js — Bấm vào vùng video để phát / tạm dừng (kiểu YouTube),
 * kèm icon nháy giữa khung để user biết đã nhận thao tác.
 *
 * Nghe ở CAPTURE phase trên document: chạy trước mọi listener FB gắn sẵn trên
 * <video> (nếu FB cũng tự toggle thì 2 lần sẽ triệt tiêu nhau) rồi chặn lan tiếp.
 * composedPath() để nhận đúng video cả khi nằm trong shadow DOM của Cinema.
 */

import { icons } from './icons.js';

const FLASH_MS = 450;
const FLASH_ICON_PX = 44;

/**
 * @param {Document} doc
 * @param {HTMLVideoElement} video
 * @param {(target, type, fn, opts?) => void} listen - listener theo vòng đời toolbar
 * @param {() => boolean} closeOpenMenus - đóng menu đang mở; true nếu có menu vừa bị đóng
 * @returns {HTMLElement} icon nháy (overlay, gắn vào wrapper)
 */
export function enableTapToToggle(doc, video, listen, closeOpenMenus) {
  const flash = doc.createElement('div');
  flash.className = 'tap-flash';
  let flashTimer = null;

  const showFlash = (playing) => {
    flash.innerHTML = playing ? icons.play(FLASH_ICON_PX) : icons.pause(FLASH_ICON_PX);
    flash.classList.remove('show');
    void flash.offsetWidth; // restart animation khi bấm liên tục
    flash.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => flash.classList.remove('show'), FLASH_MS);
  };

  video.style.cursor = 'pointer';
  listen(doc, 'click', (e) => {
    if (e.button !== 0 || e.composedPath()[0] !== video) return;
    e.stopPropagation();
    e.preventDefault();
    // Menu đang mở → lần bấm này chỉ để đóng menu, không đổi trạng thái phát
    if (closeOpenMenus()) return;
    if (video.paused) {
      video.play().catch(() => {});
      showFlash(true);
    } else {
      video.pause();
      showFlash(false);
    }
  }, { capture: true });

  return flash;
}
