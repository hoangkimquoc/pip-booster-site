/**
 * download.js — Tải video reel để xem offline.
 *
 * Reel FB dùng MSE/blob → thường KHÔNG có URL mp4 tải thẳng. Hai nhánh:
 *  1. video.currentSrc là http(s) → fetch + tải ngay (full chất lượng).
 *  2. blob/MSE → ghi realtime bằng MediaRecorder (video.captureStream) → .webm.
 *     (Phải phát tới hết hoặc bấm dừng để lưu — hạn chế của MSE.)
 */

import { pipLog } from './debug-log.js';

const RECORD_TICK_MS = 500;
const RECORDER_TIMESLICE_MS = 1000;
const REVOKE_URL_AFTER_MS = 60000;

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_URL_AFTER_MS);
}

function pickMime() {
  const cands = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of cands) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

/**
 * Bắt đầu tải/ghi. onProgress nhận { mode, pct?, elapsed?, done? }.
 * Trả { mode: 'direct'|'record'|'unsupported', stop? }.
 */
export async function startDownload(video, filename = 'reel', onProgress) {
  const src = video.currentSrc || video.src || '';
  if (/^https?:/i.test(src)) {
    try {
      const res = await fetch(src);
      // 403/404 → không lưu trang lỗi thành .mp4; rơi xuống nhánh ghi realtime
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = Number(res.headers.get('content-length') || 0);
      let blob;
      if (res.body && total && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        const parts = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          received += value.length;
          onProgress?.({ mode: 'direct', pct: Math.round((received / total) * 100) });
        }
        blob = new Blob(parts);
      } else {
        blob = await res.blob();
      }
      triggerDownload(URL.createObjectURL(blob), filename + '.mp4');
      onProgress?.({ mode: 'direct', done: true });
      pipLog('download: URL trực tiếp OK');
      return { mode: 'direct' };
    } catch (e) {
      pipLog('download: fetch URL lỗi → chuyển sang ghi', e);
    }
  }
  return recordVideo(video, filename, onProgress);
}

function recordVideo(video, filename, onProgress) {
  const capture = video.captureStream || video.mozCaptureStream;
  if (typeof capture !== 'function' || typeof MediaRecorder === 'undefined') {
    pipLog('download: không hỗ trợ ghi (captureStream/MediaRecorder)');
    return { mode: 'unsupported' };
  }

  let stream;
  try {
    stream = capture.call(video);
  } catch (e) {
    pipLog('download: captureStream lỗi', e);
    return { mode: 'unsupported' };
  }

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const startTs = Date.now();
  const timer = setInterval(() => {
    onProgress?.({ mode: 'record', elapsed: Math.floor((Date.now() - startTs) / 1000) });
  }, RECORD_TICK_MS);

  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    clearInterval(timer);
    const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
    triggerDownload(URL.createObjectURL(blob), filename + '.webm');
    onProgress?.({ mode: 'record', done: true });
    pipLog('download: ghi xong', { bytes: blob.size });
  };
  rec.start(RECORDER_TIMESLICE_MS);

  const onEnded = () => { if (rec.state !== 'inactive') rec.stop(); };
  video.addEventListener('ended', onEnded, { once: true });

  pipLog('download: bắt đầu ghi realtime (MSE)');
  return {
    mode: 'record',
    stop: () => {
      video.removeEventListener('ended', onEnded);
      if (rec.state !== 'inactive') rec.stop();
    },
  };
}
