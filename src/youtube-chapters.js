/**
 * youtube-chapters.js — Đọc chapter của video YouTube từ DOM mô tả
 * (ytd-macro-markers-list-item-renderer: .macro-markers = tên, #time = mốc). Mô tả và panel
 * "Chapters" cùng render danh sách → lọc trùng theo mốc thời gian.
 * Đọc live mỗi lần cần (sang video kế bằng SPA thì DOM đổi theo).
 */

/** "1:02:03" / "4:09" → giây; null nếu không hợp lệ. */
export function parseTimestamp(str) {
  const parts = String(str || '').trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((sum, p) => sum * 60 + Number(p), 0);
}

/** @returns {{ title: string, start: number }[]} sắp theo thời gian */
export function readChapters(root = document) {
  const byStart = new Map();
  for (const item of root.querySelectorAll('ytd-macro-markers-list-item-renderer')) {
    const title = (item.querySelector('.macro-markers, h4')?.textContent || '').trim();
    const start = parseTimestamp(item.querySelector('#time')?.textContent);
    if (title && start !== null && !byStart.has(start)) byStart.set(start, { title, start });
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** Chỉ số chapter chứa thời điểm t (-1 nếu không có chapter). */
export function chapterIndexAt(chapters, t) {
  let idx = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].start <= t) idx = i;
    else break;
  }
  return idx;
}
