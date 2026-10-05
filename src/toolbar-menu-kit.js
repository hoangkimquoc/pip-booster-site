/**
 * toolbar-menu-kit.js — Menu nổi dùng chung cho các bộ công cụ theo nền tảng
 * (YouTube, Netflix): tạo menu, dòng chọn, mở menu có nội dung tải async.
 */

import { t } from './i18n.js';
import { anchorMenu, escapeHtml } from './toolbar-dom-helpers.js';

/**
 * @param {Document} doc
 * @param {(except?: Element) => void} closeMenus - đóng các menu khác của toolbar
 */
export function createMenuKit(doc, closeMenus) {
  const newMenu = (id) => {
    const m = doc.createElement('div');
    m.id = id;
    m.className = 'pb-menu';
    return m;
  };

  /** Một dòng chọn trong menu. */
  const option = (label, active, onPick) => {
    const opt = doc.createElement('button');
    opt.className = 'speed-opt' + (active ? ' active' : '');
    opt.textContent = label;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      opt.closest('.pb-menu')?.classList.remove('open');
      void onPick();
    });
    return opt;
  };

  /** Dòng ghi chú (không bấm được). */
  const note = (menu, key) => {
    menu.innerHTML = `<div class="pb-menu-note">${escapeHtml(t(key))}</div>`;
  };

  /**
   * Mở/đóng `menu` phía trên `btn`. Hiện "Đang tải…" rồi gọi `fill(menu)` (có thể async) —
   * fill tự xoá nội dung cũ khi đã có dữ liệu.
   */
  const openMenu = async (btn, menu, fill) => {
    if (menu.classList.contains('open')) { menu.classList.remove('open'); return; }
    closeMenus(menu);
    note(menu, 'cc_loading');
    menu.classList.add('open');
    anchorMenu(menu, btn);
    try {
      await fill(menu);
    } catch {
      note(menu, 'yt_action_failed');
    }
    anchorMenu(menu, btn); // kích thước menu đổi sau khi có dữ liệu
  };

  return { newMenu, option, note, openMenu };
}
