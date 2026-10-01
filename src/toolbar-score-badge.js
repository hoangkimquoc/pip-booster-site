/**
 * toolbar-score-badge.js — Badge điểm hấp dẫn + panel chi tiết trong toolbar.
 *
 * Dùng CHUNG điểm/stats với chip trên reel (content.js lưu reelContainer.__quickScore)
 * để 2 nơi luôn hiển thị cùng một con số.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { pipLog } from './debug-log.js';
import { calcQuickScore, quickScoreLabelKey } from './pip-score.js';
import { parseEngagementStats } from './fb-adapter.js';
import { escapeHtml } from './toolbar-dom-helpers.js';

const NO_SCORE_COLOR = '#6b7280';
/** Hậu tố alpha hex cho viền / nền badge theo màu điểm. */
const BORDER_ALPHA = '4d';
const BG_ALPHA = '1a';

/** @returns {{ badge: HTMLElement, breakdownEl: HTMLElement }} */
export function buildScoreBadge(doc, reelContainer) {
  const badge = doc.createElement('div');
  badge.id = 'pip-score-badge';
  badge.className = 'loading';
  badge.innerHTML = icons.sparkle(14) + '<span id="score-val">—</span>';
  badge.dataset.tip = t('score');

  const breakdownEl = doc.createElement('div');
  breakdownEl.id = 'score-breakdown';

  displayScore(reelContainer, badge, breakdownEl);
  return { badge, breakdownEl };
}

function displayScore(reelContainer, badge, breakdownEl) {
  const scoreVal = badge.querySelector('#score-val');
  try {
    const cached = reelContainer && reelContainer.__quickScore;
    const stats = (cached && cached.stats) || parseEngagementStats(reelContainer);
    const { score, color } = calcQuickScore(stats);
    pipLog('PiP Score (đồng bộ chip)', { stats, score });
    if (!scoreVal) return;

    badge.classList.remove('loading');
    if (score == null) {
      scoreVal.textContent = t('score_na');
      badge.dataset.tip = t('score_insufficient');
      badge.style.color = NO_SCORE_COLOR;
    } else {
      scoreVal.innerHTML = `${score}<span class="score-word"> ${escapeHtml(t(quickScoreLabelKey(score)))}</span>`;
      badge.style.color = color;
      badge.style.borderColor = color + BORDER_ALPHA;
      badge.style.background = color + BG_ALPHA;
    }
    renderBreakdown(breakdownEl, stats, score);
  } catch (err) {
    if (scoreVal) scoreVal.textContent = t('score_na');
    badge.dataset.tip = t('error_generic', { msg: err.message });
  }
}

/** Số đếm giữ nguyên; null → —. */
function fmtCount(n) {
  return n == null ? '—' : String(n);
}

function renderBreakdown(el, stats, score) {
  const s = stats || {};
  const rows = [[t('score'), score == null ? t('score_na') : `${score}/10`]];
  if (s.views != null) rows.push([t('bd_views'), fmtCount(s.views)]);
  rows.push([t('bd_likes'), fmtCount(s.likes)]);
  rows.push([t('bd_comments'), fmtCount(s.comments)]);
  rows.push([t('bd_shares'), fmtCount(s.shares)]);

  el.innerHTML = `
    <div class="bd-title">${escapeHtml(t('score_breakdown_title'))}</div>
    ${rows.map(([l, v]) => `<div class="bd-row"><span class="bd-label">${escapeHtml(l)}</span><span class="bd-val">${escapeHtml(v)}</span></div>`).join('')}
  `;
}
