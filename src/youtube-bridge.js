/**
 * youtube-bridge.js — Phía content script (isolated world) gọi yt-main-bridge.js
 * (MAIN world) để dùng API player YouTube: phụ đề, chất lượng.
 */

const REQ = 'pipbooster-yt-req';
const RES = 'pipbooster-yt-res';
const CALL_TIMEOUT_MS = 4000;

const pending = new Map();
let seq = 0;
let listening = false;

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d.source !== RES) return;
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.error) p.reject(new Error(d.error));
    else p.resolve(d.result);
  });
}

/**
 * Gọi lệnh của bridge MAIN world.
 * @param {'captions'|'setCaption'|'qualities'|'setQuality'} cmd
 * @returns {Promise<any>} reject khi lỗi / quá thời gian (bridge chưa nạp)
 */
export function ytCall(cmd, ...args) {
  listen();
  const id = `pb${++seq}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.postMessage({ source: REQ, id, cmd, args }, '*');
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error('timeout'));
    }, CALL_TIMEOUT_MS);
  });
}
