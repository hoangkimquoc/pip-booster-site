/**
 * debug-log.js — Log sink đọc được từ bên ngoài.
 *
 * Vì sao cần: trên facebook.com, CSP chặn `eval` (browser MCP không eval được)
 * và không có CDP remote-debugging port → không đọc được console của content
 * script. Sink này mirror log ra một DOM node off-screen với selector cố định
 * (#pipbooster-debug-log), đọc được bằng DOM/extract tool mà không cần eval.
 *
 * Bản release (`node build.js --release`) build tự đặt DEBUG=false: không log
 * console, không tạo node trên trang FB (tránh lộ hành vi/trạng thái cho trang).
 */

export const DEBUG = true;
const SINK_ID = 'pipbooster-debug-log';
const MAX_LINES = 200;

/** Lấy (tạo nếu chưa có) DOM node chứa log — off-screen, không cản trở UI. */
function getSink() {
  let el = document.getElementById(SINK_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = SINK_ID;
    // Không dùng display:none để innerText/a11y vẫn đọc được; ẩn bằng off-screen.
    el.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;overflow:hidden;' +
      'opacity:0.01;pointer-events:none;white-space:pre;z-index:2147483647;';
    (document.body || document.documentElement).appendChild(el);
  }
  return el;
}

/** Chuẩn hoá 1 arg thành string. */
function fmt(a) {
  if (a instanceof Error) return `${a.name}: ${a.message}`;
  if (typeof a === 'object' && a !== null) {
    try { return JSON.stringify(a); } catch { return String(a); }
  }
  return String(a);
}

/** Ghi log ra console + DOM sink. */
export function pipLog(...args) {
  if (!DEBUG) return;
  const msg = args.map(fmt).join(' ');
  console.log('[PiP Booster]', msg);
  try {
    const el = getSink();
    const ts = new Date().toISOString().slice(11, 19);
    const lines = (el.textContent + `[${ts}] ${msg}\n`).split('\n');
    el.textContent = lines.slice(-MAX_LINES).join('\n');
  } catch { /* noop */ }
}
