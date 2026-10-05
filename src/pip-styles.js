/**
 * pip-styles.js — CSS của toolbar + layout, dùng chung PiP window và Cinema (shadow DOM).
 * Chỉ là dữ liệu tĩnh — không tham chiếu document lúc import (test node chạy được).
 */

/** CSS toolbar + layout — dùng cho PiP document và shadow root của Cinema. */
export const PIP_STYLES = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { color-scheme: dark; }
    ::selection { background: rgba(124,108,255,0.4); color: #fff; }

    button {
      appearance: none;
      -webkit-appearance: none;
      font-family: inherit;
    }
    :focus { outline: none; }
    :focus-visible { outline: 2px solid rgba(124,108,255,0.6); outline-offset: 1px; }

    html, body {
      width: 100%;
      height: 100%;
      background: #0d0d0d;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    #pip-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #000;
    }

    video {
      flex: 1;
      width: 100%;
      object-fit: contain;
      background: #000;
      min-height: 0;
    }

    /* Toolbar ẩn, hiện khi hover */
    /* Phụ đề nền tảng chép sang (subtitle-mirror.js) — nằm trên toolbar */
    .pb-subs {
      position: absolute; left: 4%; right: 4%; bottom: 14%; z-index: 15;
      text-align: center; white-space: pre-line; pointer-events: none;
      font-size: clamp(13px, 4.2vmin, 26px); line-height: 1.35; font-weight: 600; color: #fff;
      text-shadow: 0 0 3px #000, 0 0 6px #000, 0 1px 2px #000;
    }
    .pb-subs[hidden] { display: none; }

    #pip-toolbar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      padding: 12px 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 10;
    }

    #pip-wrapper:hover #pip-toolbar { opacity: 1; }

    /* Khi panel tra phim mở thì luôn hiện toolbar */
    #pip-wrapper.panel-open #pip-toolbar { opacity: 1; }

    .toolbar-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Thanh seek/progress kiểu YouTube */
    #pip-progress {
      position: relative;
      height: 14px;
      display: flex;
      align-items: center;
      cursor: pointer;
      margin: 0 2px;
      touch-action: none;
    }
    #pip-progress::before {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: 3px;
      background: rgba(255,255,255,0.3);
      border-radius: 2px;
      transition: height 0.1s ease;
    }
    #pip-progress:hover::before { height: 5px; }

    #pip-progress-hover, #pip-progress-filled {
      position: absolute;
      left: 0;
      height: 3px;
      border-radius: 2px;
      transition: height 0.1s ease;
      pointer-events: none;
    }
    #pip-progress:hover #pip-progress-hover,
    #pip-progress:hover #pip-progress-filled { height: 5px; }
    #pip-progress-hover { width: 0; background: rgba(255,255,255,0.35); }
    #pip-progress-filled { width: 0; background: #a78bfa; z-index: 1; }

    #pip-progress-handle {
      position: absolute;
      left: 0;
      width: 12px; height: 12px;
      border-radius: 50%;
      background: #a78bfa;
      transform: translateX(-50%) scale(0);
      transition: transform 0.1s ease;
      z-index: 2;
      pointer-events: none;
    }
    #pip-progress:hover #pip-progress-handle { transform: translateX(-50%) scale(1); }

    #pip-progress-tooltip {
      position: absolute;
      bottom: 18px;
      left: 0;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
      display: none;
      pointer-events: none;
      z-index: 3;
    }
    #pip-progress:hover #pip-progress-tooltip { display: block; }

    /* Nhãn tốc độ trên nút speed */
    #btn-speed { gap: 3px; }
    .speed-label { font-size: 11px; font-weight: 700; }

    /* Âm lượng */
    .vol-wrap { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .vol-slider {
      width: 64px;
      height: 4px;
      cursor: pointer;
      accent-color: #a78bfa;
    }

    .pip-btn {
      background: none;
      border: none;
      color: #e5e7eb;
      cursor: pointer;
      padding: 5px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .pip-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .pip-btn:active { background: rgba(255,255,255,0.2); }
    .pip-btn.active { color: #a78bfa; }
    .pip-btn.recording { color: #ef4444; }
    @keyframes pipRecPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    .pip-btn.recording svg { animation: pipRecPulse 1.2s ease-in-out infinite; }
    .dl-label { font-size: 11px; font-weight: 700; margin-left: 4px; }
    .pip-btn.pro-locked { color: #6b7280; cursor: not-allowed; }
    .pip-btn.pro-locked:hover { background: rgba(255,255,255,0.05); }

    /* Tooltip tuỳ biến (thay title đen mặc định) */
    [data-tip] { position: relative; }
    [data-tip]:hover::after {
      content: attr(data-tip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      color: #e5e7eb;
      font: 500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 4px 8px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 50;
      box-shadow: 0 3px 10px rgba(0,0,0,0.45);
      border: 1px solid rgba(124,108,255,0.3);
    }

    .spacer { flex: 1; }

    /* Icon nháy giữa khung khi bấm vào video để phát / dừng */
    .tap-flash {
      position: absolute; top: 50%; left: 50%;
      width: 76px; height: 76px; margin: -38px 0 0 -38px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff;
      opacity: 0; pointer-events: none; z-index: 15;
    }
    .tap-flash.show { animation: pbTapFlash 0.45s ease-out forwards; }
    @keyframes pbTapFlash {
      0% { opacity: 0.95; transform: scale(0.85); }
      100% { opacity: 0; transform: scale(1.25); }
    }

    /* === Layout toolbar responsive (container query theo bề rộng toolbar) === */
    #pip-toolbar { container-type: inline-size; }
    .toolbar-rows { display: flex; flex-direction: column; gap: 6px; }
    .pip-btn.busy { opacity: 0.5; pointer-events: none; }

    /* Tooltip nút đầu/cuối hàng căn theo mép → không tràn khỏi cửa sổ */
    .toolbar-row > [data-tip]:first-child:hover::after { left: 0; transform: none; }
    .toolbar-row > [data-tip]:last-child:hover::after { left: auto; right: 0; transform: none; }

    /* Hẹp (PiP dọc ~340px): bỏ chữ, giữ icon */
    @container (max-width: 400px) {
      .vol-slider, .tp-label, .score-word { display: none; }
      .toolbar-row { gap: 2px; }
    }
    /* Rất hẹp (~240px): bỏ preset size (kéo góc thay) + Tra phim (panel không đủ chỗ) */
    @container (max-width: 300px) {
      .speed-label, .tb-size, #btn-tra-phim { display: none; }
      .pip-btn { padding: 4px; }
    }
    /* Rộng (cinema / PiP kéo to): gộp 2 hàng thành 1, nút đóng về cuối */
    @container (min-width: 760px) {
      .toolbar-rows { flex-direction: row; align-items: center; gap: 6px; }
      .toolbar-row { display: contents; }
      .toolbar-row:first-child > .spacer { display: none; }
      .tb-close { order: 99; }
    }

    /* Menu phụ đề (dựng từ submenu FB) */
    .pb-menu {
      position: absolute;
      bottom: 56px;
      background: #1a1a2e;
      border: 1px solid rgba(124,108,255,0.3);
      border-radius: 8px;
      padding: 4px;
      display: none;
      flex-direction: column;
      gap: 2px;
      z-index: 20;
      min-width: 140px;
      max-height: 60vh;
      overflow-y: auto;
    }
    .pb-menu.open { display: flex; }
    .pb-menu .speed-opt { text-align: left; white-space: nowrap; }
    .pb-menu-note { font-size: 12px; color: #9ca3af; padding: 6px 10px; white-space: nowrap; }

    /* YouTube: nút chapter (ẩn khi video không có chương) + nhãn chương hiện tại */
    .yt-chapter:not(.has-chapters) { display: none; }
    .yt-chapter-label { font-size: 12px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: 4px; }
    .yt-chapter-label:empty { display: none; }
    @container (max-width: 400px) { .yt-chapter-label { display: none; } }
    /* Netflix: nút chữ (Âm thanh) + nút nổi "Bỏ qua phần mở đầu" như của Netflix */
    .nf-text-btn { font-size: 12px; font-weight: 600; white-space: nowrap; }
    .nf-skip { position: absolute; right: 12px; bottom: 112px; z-index: 16; display: none;
      background: rgba(20,20,30,0.85); border: 1px solid rgba(255,255,255,0.35); border-radius: 8px; padding: 6px 12px; gap: 6px; }
    .nf-skip.show { display: inline-flex; align-items: center; }
    .ab-loop .ab-label { font-size: 11px; font-weight: 700; letter-spacing: 0.02em; }
    .ab-loop svg { margin-left: 2px; }

    /* Badge PiP Score */
    #pip-score-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #a78bfa;
      padding: 3px 7px;
      border-radius: 12px;
      background: rgba(124, 108, 255, 0.15);
      border: 1px solid rgba(124, 108, 255, 0.3);
      cursor: pointer;
      transition: background 0.15s;
    }
    #pip-score-badge:hover { background: rgba(124, 108, 255, 0.25); }
    #pip-score-badge.loading { color: #6b7280; border-color: rgba(107,114,128,0.3); background: rgba(107,114,128,0.1); }

    /* Speed selector */
    #speed-menu {
      position: absolute;
      bottom: 56px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      border: 1px solid rgba(124,108,255,0.3);
      border-radius: 8px;
      padding: 4px;
      display: none;
      flex-direction: column;
      gap: 2px;
      z-index: 20;
      min-width: 80px;
    }
    #speed-menu.open { display: flex; }

    .speed-opt {
      background: none;
      border: none;
      color: #d1d5db;
      font-size: 13px;
      padding: 5px 12px;
      border-radius: 5px;
      cursor: pointer;
      text-align: center;
    }
    .speed-opt:hover { background: rgba(124,108,255,0.2); color: #fff; }
    .speed-opt.active { color: #a78bfa; font-weight: 700; }

    /* Size / tỉ lệ selector */
    #size-menu {
      position: absolute;
      bottom: 56px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      border: 1px solid rgba(124,108,255,0.3);
      border-radius: 8px;
      padding: 4px;
      display: none;
      flex-direction: column;
      gap: 2px;
      z-index: 20;
      min-width: 110px;
    }
    #size-menu.open { display: flex; }

    .size-opt {
      background: none;
      border: none;
      color: #d1d5db;
      font-size: 13px;
      padding: 5px 12px;
      border-radius: 5px;
      cursor: pointer;
      text-align: left;
    }
    .size-opt:hover { background: rgba(124,108,255,0.2); color: #fff; }
    .size-opt.active { color: #a78bfa; font-weight: 700; }

    /* Movie panel */
    #movie-panel {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10,10,20,0.96);
      padding: 12px;
      overflow-y: auto;
      display: none;
      flex-direction: column;
      gap: 8px;
      z-index: 30;
    }
    #movie-panel.open { display: flex; }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: #a78bfa;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .movie-section-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 4px 0 2px;
    }

    .movie-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
      color: inherit;
    }
    .movie-item:hover { background: rgba(124,108,255,0.15); }

    .movie-item-title {
      font-size: 12px;
      color: #e5e7eb;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .movie-item-count {
      font-size: 10px;
      color: #6b7280;
      flex-shrink: 0;
    }
    .movie-item-yt { color: #ef4444; }
    .movie-item-part { color: #a78bfa; display: inline-flex; }
    .movie-item-badge { font-size: 10px; font-weight: 700; color: #c4b5fd; padding: 2px 6px; border-radius: 999px;
      background: rgba(124,108,255,0.18); flex-shrink: 0; }

    .panel-empty {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      padding: 24px 0;
    }

    .panel-scanning {
      text-align: center;
      color: #a78bfa;
      font-size: 12px;
      padding: 16px 0;
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Score breakdown tooltip */
    #score-breakdown {
      position: absolute;
      bottom: 56px;
      right: 8px;
      background: #1a1a2e;
      border: 1px solid rgba(124,108,255,0.3);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
      color: #d1d5db;
      display: none;
      flex-direction: column;
      gap: 4px;
      z-index: 20;
      min-width: 180px;
    }
    #score-breakdown.open { display: flex; }
    .bd-row { display: flex; justify-content: space-between; gap: 16px; }
    .bd-label { color: #9ca3af; }
    .bd-val { color: #e5e7eb; font-weight: 600; }

    .bd-title { font-size: 11px; font-weight: 700; color: #a78bfa; margin-bottom: 4px; }

    /* Pro gate (panel/menu bị khóa) */
    .pro-gate { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
    .pro-gate-title { margin: 8px 0 4px; font-weight: 600; color: #e5e7eb; }

    /* Nút có chữ + các phần panel Tra phim */
    .pip-btn-wide { gap: 6px; font-size: 12px; font-weight: 600; padding: 5px 10px; }
    .lock-mark { display: inline-flex; margin-left: 4px; }
    .panel-subtitle { font-size: 11px; color: #6b7280; }
    .panel-close { margin-left: 4px; }
    .panel-footer { font-size: 10px; color: #4b5563; text-align: center; margin-top: 8px; }
    .movie-item-search { cursor: pointer; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(124,108,255,0.3); border-radius: 2px; }
  `;

/** Inject CSS vào document của PiP. */
export function injectPipStyles(doc) {
  const style = doc.createElement('style');
  style.textContent = PIP_STYLES;
  doc.head.appendChild(style);
}
