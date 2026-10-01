/**
 * toolbar-movie-panel.js — Nút "Tra phim" (PRO) + panel kết quả quét bình luận.
 *
 * Nội dung từ bình luận là dữ liệu KHÔNG tin cậy → chỉ gán bằng textContent /
 * thuộc tính, không đưa vào innerHTML.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { pipLog } from './debug-log.js';
import { scrapeMovieInfo } from './comment-scraper.js';
import { makeBtn, makeWideBtn, showProGateMessage } from './toolbar-dom-helpers.js';
import { track } from './analytics.js';

const PANEL_OPEN_CLASS = 'panel-open';

/** @returns {{ button: HTMLElement, panel: HTMLElement }} */
export function buildMovieLookup(doc, { isPro, reelContainer }) {
  const button = makeWideBtn(doc, icons.filmSlate(16) + `<span class="tp-label">${t('movie_lookup')}</span>`);
  button.id = 'btn-tra-phim';
  button.dataset.tip = t('movie_lookup');

  if (!isPro) {
    button.classList.add('pro-locked');
    const lock = el(doc, 'span', 'lock-mark');
    lock.innerHTML = icons.lockSimple(12);
    button.appendChild(lock);
    button.dataset.tip = t('pro_tooltip');
  }

  const panel = doc.createElement('div');
  panel.id = 'movie-panel';

  // Wrapper = cha của panel (PiP document hoặc shadow root của Cinema)
  const setWrapperOpen = (open) => panel.parentElement?.classList.toggle(PANEL_OPEN_CLASS, open);
  const closePanel = () => {
    panel.classList.remove('open');
    setWrapperOpen(false);
  };

  button.addEventListener('click', async () => {
    pipLog('Tra phim: click', { isPro });
    if (!isPro) {
      showProGateMessage(panel, 'movie_lookup');
      return;
    }
    if (panel.classList.contains('open')) {
      closePanel();
      return;
    }

    panel.classList.add('open');
    setWrapperOpen(true);
    track('movie_lookup_used');
    renderScanning(doc, panel);

    try {
      const result = await scrapeMovieInfo(reelContainer);
      pipLog('Tra phim: scrape xong', {
        scanned: result.totalCommentsScanned,
        hits: result.commentsWithHits,
        yt: result.youtubeLinks.length,
        titles: result.movieTitles.length,
      });
      renderResult(doc, panel, result, closePanel);
    } catch (err) {
      pipLog('Tra phim: LỖI', err);
      panel.textContent = '';
      panel.appendChild(el(doc, 'div', 'panel-empty', t('error_generic', { msg: err.message })));
    }
  });

  return { button, panel };
}

/** Tạo element với class + text (text gán bằng textContent — an toàn). */
function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderHeader(doc, panel, subtitle, onClose) {
  const header = el(doc, 'div', 'panel-header');
  const title = el(doc, 'div', 'panel-title');
  title.innerHTML = icons.filmSlate(14);
  title.append(' ' + t('movie_lookup'));
  header.appendChild(title);
  if (subtitle) header.appendChild(el(doc, 'span', 'panel-subtitle', subtitle));
  if (onClose) {
    const closeBtn = makeBtn(doc, icons.x(14));
    closeBtn.classList.add('panel-close');
    closeBtn.addEventListener('click', onClose);
    header.appendChild(closeBtn);
  }
  panel.appendChild(header);
}

function renderScanning(doc, panel) {
  panel.textContent = '';
  renderHeader(doc, panel);
  panel.appendChild(el(doc, 'div', 'panel-scanning', t('scanning')));
}

function renderResult(doc, panel, result, onClose) {
  panel.textContent = '';
  renderHeader(doc, panel, t('found_in_comments', { n: result.commentsWithHits }), onClose);

  const { youtubeLinks, movieTitles } = result;
  if (!youtubeLinks.length && !movieTitles.length) {
    const empty = el(doc, 'div', 'panel-empty');
    empty.innerHTML = `${icons.filmSlate(24)}<br><br>${result.totalCommentsScanned === 0 ? t('no_comments') : t('no_movie_found')}`;
    panel.appendChild(empty);
    return;
  }

  if (youtubeLinks.length) {
    panel.appendChild(el(doc, 'div', 'movie-section-label', t('yt_links', { n: youtubeLinks.length })));
    for (const { url, videoId, count } of youtubeLinks) {
      const item = el(doc, 'a', 'movie-item');
      item.href = url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      const icon = el(doc, 'span', 'movie-item-yt');
      icon.innerHTML = icons.filmSlate(14);
      item.append(icon, el(doc, 'span', 'movie-item-title', `youtu.be/${videoId}`), el(doc, 'span', 'movie-item-count', t('times', { n: count })));
      panel.appendChild(item);
    }
  }

  if (movieTitles.length) {
    panel.appendChild(el(doc, 'div', 'movie-section-label', t('movie_titles', { n: movieTitles.length })));
    for (const { title, count } of movieTitles) {
      const item = el(doc, 'div', 'movie-item movie-item-search');
      item.append(el(doc, 'span', 'movie-item-title', title), el(doc, 'span', 'movie-item-count', t('times', { n: count })));
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + t('search_suffix'))}`;
      item.addEventListener('click', () => window.open(searchUrl, '_blank', 'noopener,noreferrer'));
      panel.appendChild(item);
    }
  }

  panel.appendChild(el(doc, 'div', 'panel-footer', t('scanned_comments', { n: result.totalCommentsScanned })));
}
