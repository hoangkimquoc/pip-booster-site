/**
 * toolbar-netflix-tools.js — Công cụ riêng Netflix trong PiP/Cinema (FREE: đều là
 * tính năng Netflix có sẵn, chỉ mang vào cửa sổ nổi).
 *
 *   Danh sách tập · Phụ đề (chọn ngôn ngữ / tắt) · Âm thanh (chọn ngôn ngữ lồng tiếng) · Bỏ qua intro/recap
 *
 * Mọi thao tác qua API trình phát Netflix (page-bridge → nf-main-bridge, MAIN world).
 * Tập kế / về đầu tập: nút prev/next sẵn có của toolbar (platform-netflix.navigate).
 */

import { icons } from './icons.js';
import { t } from './i18n.js';
import { makeBtn, makeWideBtn } from './toolbar-dom-helpers.js';
import { createMenuKit } from './toolbar-menu-kit.js';
import { track } from './analytics.js';
import { pageCall } from './page-bridge.js';
import { seekVideo } from './video-control.js';

/**
 * @param {Document} doc
 * @param {{ video: HTMLVideoElement, closeMenus: (except?: Element) => void, listen: Function }} ctx
 * @returns {{ buttons: HTMLElement[], menus: HTMLElement[], overlays: HTMLElement[] }}
 */
export function buildNetflixTools(doc, ctx) {
  const { video, closeMenus, listen } = ctx;
  const { newMenu, option, note, openMenu } = createMenuKit(doc, closeMenus);

  /** Menu chọn track (phụ đề / âm thanh) dựng từ API Netflix. */
  const openTrackMenu = (btn, menu, listCmd, setCmd, feature) => {
    track('yt_tool_used', { feature, platform: 'netflix' });
    return openMenu(btn, menu, async (m) => {
      const { tracks, current } = await pageCall(listCmd);
      m.innerHTML = '';
      if (!tracks.length) { note(m, 'nf_no_tracks'); return; }
      for (const tr of tracks) {
        m.appendChild(option(tr.name, tr.id === current, async () => {
          await pageCall(setCmd, tr.id);
          if (feature === 'nf_subtitles') btn.classList.toggle('active', !tr.off);
        }));
      }
    });
  };

  // --- Danh sách tập (như chapter của YouTube): nhãn tập đang xem + menu chọn tập ---
  const episodeMenu = newMenu('nf-episode-menu');
  const btnEpisodes = makeBtn(doc, icons.listBullets() + '<span class="yt-chapter-label"></span>', t('episodes'));
  btnEpisodes.classList.add('nf-episodes');
  const epLabel = btnEpisodes.querySelector('.yt-chapter-label');
  /** Nhãn "Tập 5" (1 mùa) hoặc "M2 · T5" (nhiều mùa). */
  const episodeLabel = (data) => {
    for (const s of data.seasons) {
      const e = s.episodes.find((x) => x.id === data.current);
      if (e) return data.seasons.length > 1 ? t('season_episode_label', { s: s.seq, n: e.seq }) : t('episode_label', { n: e.seq });
    }
    return '';
  };
  const loadEpisodes = () => {
    pageCall('episodes').then((data) => {
      btnEpisodes.classList.toggle('has-episodes', data.seasons.length > 0);
      epLabel.textContent = episodeLabel(data);
    }).catch(() => {});
  };
  btnEpisodes.addEventListener('click', (e) => {
    e.stopPropagation();
    track('yt_tool_used', { feature: 'nf_episodes', platform: 'netflix' });
    void openMenu(btnEpisodes, episodeMenu, async (m) => {
      const data = await pageCall('episodes');
      m.innerHTML = '';
      if (!data.seasons.length) { note(m, 'nf_no_episodes'); return; }
      let active = null;
      for (const s of data.seasons) {
        if (data.seasons.length > 1) {
          const head = doc.createElement('div');
          head.className = 'pb-menu-note';
          head.textContent = s.name || t('season_label', { s: s.seq });
          m.appendChild(head);
        }
        for (const ep of s.episodes) {
          const title = ep.title && !ep.title.endsWith(String(ep.seq)) ? `${ep.seq}. ${ep.title}` : (ep.title || String(ep.seq));
          const opt = option(title, ep.id === data.current, () => pageCall('playEpisode', ep.id));
          if (ep.id === data.current) active = opt;
          m.appendChild(opt);
        }
      }
      active?.scrollIntoView({ block: 'center' });
    });
  });
  listen(video, 'loadedmetadata', loadEpisodes);
  loadEpisodes();

  // --- Phụ đề ---
  const subsMenu = newMenu('nf-subs-menu');
  const btnSubs = makeBtn(doc, icons.closedCaptioning(), t('captions'));
  btnSubs.addEventListener('click', (e) => {
    e.stopPropagation();
    void openTrackMenu(btnSubs, subsMenu, 'textTracks', 'setTextTrack', 'nf_subtitles');
  });

  // --- Âm thanh (ngôn ngữ lồng tiếng) ---
  const audioMenu = newMenu('nf-audio-menu');
  const btnAudio = makeBtn(doc, `<span class="nf-text-btn">${t('audio_short')}</span>`, t('audio_track'));
  btnAudio.addEventListener('click', (e) => {
    e.stopPropagation();
    void openTrackMenu(btnAudio, audioMenu, 'audioTracks', 'setAudioTrack', 'nf_audio');
  });

  // --- Bỏ qua intro / recap: nút nổi như của Netflix, chỉ hiện trong đoạn có thể bỏ qua ---
  const btnSkip = makeWideBtn(doc, `${icons.skipForward(16)}<span>${t('skip_intro')}</span>`);
  btnSkip.classList.add('nf-skip');
  btnSkip.dataset.tip = t('skip_intro');
  let skip = null;
  const loadCodes = () => {
    pageCall('timeCodes').then((c) => { skip = c && c.skip; syncSkip(); }).catch(() => { skip = null; });
  };
  const syncSkip = () => {
    const show = !!skip && video.currentTime >= skip.start && video.currentTime < skip.end - 1;
    btnSkip.classList.toggle('show', show);
  };
  btnSkip.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!skip) return;
    track('yt_tool_used', { feature: 'nf_skip_intro', platform: 'netflix' });
    seekVideo(video, skip.end);
    btnSkip.classList.remove('show');
  });
  listen(video, 'timeupdate', syncSkip);
  listen(video, 'loadedmetadata', loadCodes); // sang tập kế → mốc mới
  loadCodes();

  return {
    buttons: [btnEpisodes, btnSubs, btnAudio],
    menus: [episodeMenu, subsMenu, audioMenu],
    overlays: [btnSkip],
  };
}
