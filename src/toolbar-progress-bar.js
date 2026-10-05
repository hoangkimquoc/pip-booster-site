/**
 * toolbar-progress-bar.js — Thanh seek kiểu YouTube: hover → line dày lên +
 * tooltip thời gian, click/kéo để tua. Wire thật vào video element.
 */

import { formatTime } from './toolbar-dom-helpers.js';
import { seekVideo } from './video-control.js';

/**
 * @param {Document} doc
 * @param {HTMLVideoElement} video
 * @param {(target: EventTarget, type: string, fn: Function) => void} listen
 *   gắn listener có vòng đời theo toolbar (gỡ khi toolbar dispose)
 */
export function buildProgressBar(doc, video, listen) {
  const bar = doc.createElement('div');
  bar.id = 'pip-progress';

  const hover = doc.createElement('div');   // preview fill theo vị trí chuột
  hover.id = 'pip-progress-hover';
  const filled = doc.createElement('div');  // phần đã xem
  filled.id = 'pip-progress-filled';
  const handle = doc.createElement('div');  // núm kéo
  handle.id = 'pip-progress-handle';
  const tip = doc.createElement('div');     // tooltip thời gian
  tip.id = 'pip-progress-tooltip';
  bar.append(hover, filled, handle, tip);

  const ratioFrom = (e) => {
    const rect = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  };
  const paint = (r) => {
    filled.style.width = `${r * 100}%`;
    handle.style.left = `${r * 100}%`;
  };
  const seekTo = (r) => {
    if (video.duration) seekVideo(video, video.duration * r);
  };

  let dragging = false;

  listen(video, 'timeupdate', () => {
    if (dragging) return;
    paint(video.duration ? video.currentTime / video.duration : 0);
  });

  bar.addEventListener('pointermove', (e) => {
    const r = ratioFrom(e);
    hover.style.width = `${r * 100}%`;
    tip.style.left = `${r * 100}%`;
    tip.textContent = formatTime((video.duration || 0) * r);
    if (dragging) paint(r);
  });

  bar.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { bar.setPointerCapture(e.pointerId); } catch { /* noop */ }
    const r = ratioFrom(e);
    seekTo(r);
    paint(r);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { bar.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    seekTo(ratioFrom(e));
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  return bar;
}
