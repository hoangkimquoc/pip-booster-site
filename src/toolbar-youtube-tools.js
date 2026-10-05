/**
 * toolbar-youtube-tools.js — Công cụ riêng YouTube trong PiP/Cinema (FREE: đều là
 * tính năng YouTube có sẵn, chỉ mang vào cửa sổ nổi) + lặp đoạn A-B (PRO).
 *
 *   Chapter · Phụ đề (bật/tắt + ngôn ngữ) · Chất lượng · Lặp video · A-B · Like
 *
 * Phụ đề/chất lượng qua API player (page-bridge → yt-main-bridge, MAIN world);
 * chapter đọc DOM mô tả; lặp = video.loop (cách YouTube "Loop" làm); like = nút của trang.
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { formatTime, makeBtn } from './toolbar-dom-helpers.js';
import { createMenuKit } from './toolbar-menu-kit.js';
import { track } from './analytics.js';
import { pageCall } from './page-bridge.js';
import { chapterIndexAt, readChapters } from './youtube-chapters.js';
import { buildAbLoop } from './toolbar-ab-loop.js';
import { seekVideo } from './video-control.js';

/** Nhãn chất lượng theo mã của YouTube. */
const QUALITY_LABELS = {
  highres: '4320p', hd2880: '2880p', hd2160: '2160p 4K', hd1440: '1440p', hd1080: '1080p',
  hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p',
};
const LIKE_SELECTOR = 'like-button-view-model button, #segmented-like-button button';
const LIKE_SETTLE_MS = 600;

/**
 * @param {Document} doc
 * @param {{ video: HTMLVideoElement, closeMenus: (except?: Element) => void, listen: Function }} ctx
 * @returns {{ buttons: HTMLElement[], menus: HTMLElement[] } | null} null trên Shorts (player khác, không có các tool này)
 */
export function buildYoutubeTools(doc, ctx) {
  if (/^\/shorts\//.test(location.pathname)) return null;
  const { video, closeMenus, listen, isPro = false } = ctx;
  const { newMenu, option, note, openMenu } = createMenuKit(doc, closeMenus);

  // --- Chapter: nhãn chapter hiện tại + menu nhảy chapter ---
  const chapterMenu = newMenu('yt-chapter-menu');
  const btnChapter = makeBtn(doc, icons.listBullets() + '<span class="yt-chapter-label"></span>', t('chapters'));
  btnChapter.classList.add('yt-chapter');
  const label = btnChapter.querySelector('.yt-chapter-label');
  // timeupdate bắn ~4 lần/giây → chỉ đọc lại DOM khi đổi video (SPA đổi URL)
  let cache = { href: '', list: [] };
  const chaptersNow = () => {
    if (cache.href !== location.href || !cache.list.length) cache = { href: location.href, list: readChapters() };
    return cache.list;
  };
  const syncChapter = () => {
    const chapters = chaptersNow();
    const i = chapterIndexAt(chapters, video.currentTime);
    label.textContent = i >= 0 ? chapters[i].title : '';
    btnChapter.classList.toggle('has-chapters', chapters.length > 0);
  };
  listen(video, 'timeupdate', syncChapter);
  listen(video, 'loadedmetadata', syncChapter);
  syncChapter();
  btnChapter.addEventListener('click', (e) => {
    e.stopPropagation();
    track('yt_tool_used', { feature: 'chapters' });
    void openMenu(btnChapter, chapterMenu, (menu) => {
      const chapters = readChapters();
      menu.innerHTML = '';
      if (!chapters.length) {
        note(menu, 'no_chapters');
        return;
      }
      const cur = chapterIndexAt(chapters, video.currentTime);
      chapters.forEach((c, i) => menu.appendChild(option(`${formatTime(c.start)}  ${c.title}`, i === cur, () => {
        seekVideo(video, c.start);
        syncChapter();
      })));
    });
  });

  // --- Phụ đề: tắt / chọn track ---
  const ccMenu = newMenu('yt-cc-menu');
  const btnCc = makeBtn(doc, icons.closedCaptioning(), t('captions'));
  btnCc.addEventListener('click', (e) => {
    e.stopPropagation();
    track('yt_tool_used', { feature: 'captions' });
    void openMenu(btnCc, ccMenu, async (menu) => {
      const { tracks, current } = await pageCall('captions');
      menu.innerHTML = '';
      if (!tracks.length) {
        note(menu, 'yt_no_captions');
        return;
      }
      const pick = async (id) => {
        const ok = await pageCall('setCaption', id);
        btnCc.classList.toggle('active', !!(ok && id));
      };
      menu.appendChild(option(t('cc_off'), !current, () => pick(null)));
      for (const tr of tracks) menu.appendChild(option(tr.name, current === (tr.vss || tr.code), () => pick(tr.vss || tr.code)));
      btnCc.classList.toggle('active', !!current);
    });
  });

  // --- Chất lượng ---
  const qualityMenu = newMenu('yt-quality-menu');
  const btnQuality = makeBtn(doc, icons.gear(), t('quality'));
  // getPlaybackQuality() của YouTube báo trễ (đoạn đã tải sẵn) → đánh dấu theo lựa chọn của user
  let chosenQuality = null;
  btnQuality.addEventListener('click', (e) => {
    e.stopPropagation();
    track('yt_tool_used', { feature: 'quality' });
    void openMenu(btnQuality, qualityMenu, async (menu) => {
      const { levels, current } = await pageCall('qualities');
      const active = chosenQuality || current;
      menu.innerHTML = '';
      for (const q of levels) {
        const name = q === 'auto' ? t('quality_auto') : (QUALITY_LABELS[q] || q);
        menu.appendChild(option(name, q === active, () => {
          chosenQuality = q;
          return pageCall('setQuality', q);
        }));
      }
    });
  });

  // --- Lặp video ---
  const btnLoop = makeBtn(doc, icons.repeat(), t('loop'));
  const syncLoop = () => btnLoop.classList.toggle('active', video.loop);
  btnLoop.addEventListener('click', (e) => {
    e.stopPropagation();
    video.loop = !video.loop;
    track('yt_tool_used', { feature: 'loop' });
    syncLoop();
  });
  syncLoop();

  // --- Like (nút của trang; chưa đăng nhập thì YouTube tự mời đăng nhập trên trang) ---
  const btnLike = makeBtn(doc, icons.thumbsUp(), t('like_video'));
  const likeBtnOnPage = () => document.querySelector(LIKE_SELECTOR);
  const syncLike = () => btnLike.classList.toggle('active', likeBtnOnPage()?.getAttribute('aria-pressed') === 'true');
  btnLike.addEventListener('click', (e) => {
    e.stopPropagation();
    const pageBtn = likeBtnOnPage();
    if (!pageBtn) return;
    track('yt_tool_used', { feature: 'like' });
    pageBtn.click();
    setTimeout(syncLike, LIKE_SETTLE_MS);
  });
  listen(video, 'loadedmetadata', syncLike);
  syncLike();

  // --- Lặp đoạn A-B (PRO — tự dựng) ---
  const ab = buildAbLoop(doc, { video, isPro, listen });

  return {
    buttons: [btnChapter, btnCc, btnQuality, btnLoop, ab.button, btnLike],
    menus: [chapterMenu, ccMenu, qualityMenu, ab.menu],
  };
}
