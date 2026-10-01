/**
 * toolbar-download-button.js — Nút tải video (xem offline) + tiến trình.
 *
 * CHỈ có trong bản dev/tự phân phối: bản Chrome Web Store loại module này và
 * download.js khỏi bundle (build.js RELEASE_EXCLUDE) vì chính sách bản quyền.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { startDownload } from './download.js';
import { formatTime, makeBtn } from './toolbar-dom-helpers.js';
import { track } from './analytics.js';

export /**
 * Nút tải video: hiện tiến trình (mm:ss khi ghi realtime, % khi tải thẳng).
 * @returns {{ button: HTMLElement, stop: () => void }} stop = dừng + lưu bản ghi đang chạy
 */
function buildDownloadButton(doc, video) {
  let recording = null;
  const button = makeBtn(doc, icons.downloadSimple(), t('download'));

  const setIdle = () => {
    recording = null;
    button.innerHTML = icons.downloadSimple();
    button.classList.remove('recording');
    button.dataset.tip = t('download');
  };
  const onProgress = (p) => {
    if (p.done) { setIdle(); return; }
    if (p.mode === 'record') {
      button.classList.add('recording');
      button.dataset.tip = t('stop_record');
      button.innerHTML = icons.record() + `<span class="dl-label">${formatTime(p.elapsed || 0)}</span>`;
    } else if (p.mode === 'direct') {
      button.innerHTML = icons.downloadSimple() + `<span class="dl-label">${Number(p.pct) || 0}%</span>`;
    }
  };

  button.addEventListener('click', async () => {
    if (recording) { recording.stop(); return; } // onstop → done → setIdle
    if (button.classList.contains('busy')) return;  // đang tải thẳng
    button.classList.add('busy');
    track('download_started');
    const ctl = await startDownload(video, 'reel-' + Date.now(), onProgress);
    button.classList.remove('busy');
    recording = ctl && ctl.mode === 'record' ? ctl : null;
  });

  return { button, stop: () => recording?.stop() };
}
