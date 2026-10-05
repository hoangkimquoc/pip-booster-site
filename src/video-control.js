/**
 * video-control.js — Tua / đổi tốc độ video qua một chỗ duy nhất.
 * Nền tảng nào cấm thao tác thẳng lên <video> (Netflix: gán currentTime → lỗi M7375)
 * thì khai báo platform.seek / platform.setRate để đi qua API trình phát.
 */

import { getPlatform } from './platform.js';

/** Tua tới giây `sec` (kẹp trong [0, duration]). */
export function seekVideo(video, sec) {
  const max = isFinite(video.duration) && video.duration > 0 ? video.duration : Infinity;
  const t = Math.min(Math.max(0, sec), max);
  const seek = getPlatform().seek;
  if (typeof seek === 'function') seek(video, t);
  else video.currentTime = t;
}

/** Đổi tốc độ phát. */
export function setVideoRate(video, rate) {
  const setRate = getPlatform().setRate;
  if (typeof setRate === 'function') setRate(video, rate);
  else video.playbackRate = rate;
}
