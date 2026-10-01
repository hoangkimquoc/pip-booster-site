/**
 * toolbar-reel-actions.js — Nút Quan tâm / Không quan tâm / Phụ đề cho toolbar.
 *
 * Mọi thao tác đi qua menu "..." thật của FB (fb-reel-menu.js) nên thuật toán
 * đề xuất của FB nhận đúng tín hiệu. Không quan tâm → tự sang reel kế.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { anchorMenu, makeBtn } from './toolbar-dom-helpers.js';
import { track } from './analytics.js';
import { REEL_ACTION_LABELS, getCaptionOptions, runReelMenuAction, selectCaptionOption } from './fb-reel-menu.js';

/**
 * @param {Document} doc
 * @param {{ video: HTMLVideoElement, onNav: Function|null, closeMenus: (except?: Element) => void }} ctx
 * @returns {{ buttons: HTMLElement[], ccMenu: HTMLElement }}
 */
export function buildReelActionControls(doc, ctx) {
  const { video, onNav, closeMenus } = ctx;

  // Trạng thái đang chạy → khóa nút, tránh bấm dồn khi FB chưa phản hồi.
  const runAction = async (btn, labels, doneTip) => {
    if (btn.classList.contains('busy')) return false;
    btn.classList.add('busy');
    const ok = await runReelMenuAction(labels);
    track('reel_feedback_sent', { kind: labels[1], reason: ok ? 'ok' : 'failed' });
    btn.classList.remove('busy');
    btn.classList.toggle('active', ok);
    btn.dataset.tip = ok ? doneTip : t('action_failed');
    return ok;
  };

  const btnLike = makeBtn(doc, icons.thumbsUp(), t('interested'));
  btnLike.addEventListener('click', (e) => {
    e.stopPropagation();
    void runAction(btnLike, REEL_ACTION_LABELS.interested, t('interested_done'));
  });

  const btnDislike = makeBtn(doc, icons.thumbsDown(), t('not_interested'));
  btnDislike.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await runAction(btnDislike, REEL_ACTION_LABELS.notInterested, t('not_interested_done'));
    if (ok && typeof onNav === 'function') onNav('next');
  });

  // --- Phụ đề: dropdown dựng từ submenu FB (đọc live mỗi lần mở) ---
  const ccMenu = doc.createElement('div');
  ccMenu.id = 'cc-menu';
  ccMenu.className = 'pb-menu';

  const renderCc = (opts) => {
    ccMenu.innerHTML = '';
    if (!opts.length) {
      ccMenu.innerHTML = `<div class="pb-menu-note">${t('cc_unavailable')}</div>`;
      return;
    }
    for (const o of opts) {
      const opt = doc.createElement('button');
      opt.className = 'speed-opt' + (o.checked ? ' active' : '');
      opt.textContent = o.label;
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        ccMenu.classList.remove('open');
        const ok = await selectCaptionOption(o.label);
        btnCc.classList.toggle('active', ok && !/tắt|off/i.test(o.label));
      });
      ccMenu.appendChild(opt);
    }
  };

  const btnCc = makeBtn(doc, icons.closedCaptioning(), t('captions'));
  btnCc.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (ccMenu.classList.contains('open')) { ccMenu.classList.remove('open'); return; }
    closeMenus(ccMenu);
    track('captions_opened');
    ccMenu.innerHTML = `<div class="pb-menu-note">${t('cc_loading')}</div>`;
    ccMenu.classList.add('open');
    anchorMenu(ccMenu, btnCc);
    renderCc(await getCaptionOptions(video));
    anchorMenu(ccMenu, btnCc); // kích thước menu đổi sau khi có dữ liệu
  });

  return { buttons: [btnCc, btnLike, btnDislike], ccMenu };
}
