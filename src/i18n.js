/**
 * i18n.js — Lớp đa ngôn ngữ dùng chung (content bundle + popup).
 *
 * - Mặc định English; user tự đổi trong popup (lưu vào chrome.storage).
 * - Cho đổi tay + lưu vào chrome.storage.local ('pip_booster_locale').
 * - t(key, params) thay {name} bằng params.name.
 *
 * Dùng ở content script: build.js gộp module này vào IIFE (strip import/export),
 * mọi module khác gọi t() trực tiếp. Popup nạp bằng <script type="module">.
 */

import { STORAGE_KEYS } from './storage-keys.js';

export const LOCALES = ['vi', 'en'];
const LOCALE_STORAGE_KEY = STORAGE_KEYS.locale;

const MESSAGES = {
  vi: {
    // Trigger
    trigger_title: 'Mở trong Picture-in-Picture (PiP Booster)',
    trigger_aria: 'Mở PiP',
    cinema_title: 'Xem chế độ rạp (full màn hình)',
    quick_score_tip: 'Điểm hấp dẫn: {score}/10 · share {shares} · comment {comments}',
    score_viral: 'Viral',
    score_good: 'Hấp dẫn',
    score_avg: 'Bình thường',
    score_weak: 'Nhạt',
    score_vweak: 'Chán',
    score_na: '—',
    // Toolbar
    play_pause: 'Phát/Tạm dừng',
    rewind: 'Tua lùi 10 giây',
    forward: 'Tua tới 10 giây',
    prev_video: 'Video trước',
    next_video: 'Video kế',
    volume: 'Âm lượng',
    download: 'Tải video (offline)',
    stop_record: 'Đang ghi — bấm để dừng & lưu',
    interested: 'Quan tâm — đề xuất reel tương tự',
    interested_done: 'Đã báo Quan tâm',
    not_interested: 'Không quan tâm — bỏ qua reel này',
    not_interested_done: 'Đã báo Không quan tâm',
    action_failed: 'Không thực hiện được — FB có thể đã đổi menu',
    captions: 'Phụ đề',
    cc_loading: 'Đang tải...',
    cc_unavailable: 'Reel này không có phụ đề',
    speed: 'Tốc độ phát',
    size: 'Kích thước cửa sổ',
    pin: 'Ghim cửa sổ',
    unpin: 'Bỏ ghim',
    close: 'Đóng PiP',
    movie_lookup: 'Tra phim',
    size_portrait: 'Dọc 9:16',
    size_square: 'Vuông 1:1',
    size_landscape: 'Ngang 16:9',
    score: 'PiP Score',
    pro_tooltip: 'Tính năng PRO — Mở khóa trong popup extension',
    // Score
    score_insufficient: 'Chưa đủ dữ liệu',
    error_generic: 'Lỗi: {msg}',
    bd_engagement: 'Tương tác',
    bd_sentiment: 'Cảm xúc',
    bd_dataquality: 'Chất lượng dữ liệu',
    dq_full: 'Đầy đủ',
    dq_partial: 'Thiếu một số',
    dq_minimal: 'Tối thiểu',
    dq_insufficient: 'Không đủ',
    bd_share_rate: 'Tỉ lệ share',
    bd_comment_rate: 'Tỉ lệ comment',
    bd_like_rate: 'Tỉ lệ like',
    score_breakdown_title: 'Chi tiết PiP Score',
    bd_views: 'Lượt xem',
    bd_likes: 'Lượt thích',
    bd_comments: 'Bình luận',
    bd_shares: 'Chia sẻ',
    // Movie panel
    scanning: 'Đang quét bình luận...',
    found_in_comments: 'Tìm thấy trong {n} bình luận',
    no_movie_found: 'Không tìm thấy link phim hoặc tên phim<br>trong bình luận.',
    no_comments: 'Chưa đọc được bình luận nào.<br>FB có thể chưa tải bình luận, hoặc đã đổi giao diện.',
    yt_links: 'Link YouTube ({n})',
    times: '{n} lần',
    movie_titles: 'Tên phim đề xuất ({n})',
    scanned_comments: 'Đã quét {n} bình luận',
    search_suffix: 'phim',
    // Pro gate
    pro_feature: 'Tính năng PRO',
    pro_unlock: 'Mở khóa bằng license key<br>trong popup extension.',
    // Toasts
    popup_blocked: 'Không mở được cửa sổ nổi — trình duyệt chặn popup. Cho phép popup cho facebook.com rồi thử lại.',
    open_error: 'Lỗi mở PiP: {msg}',
    dpip_unsupported: 'Trình duyệt chưa hỗ trợ Document PiP. Cần Chrome 116 trở lên.',
    // Popup
    features: 'Tính năng',
    feat_pip: 'Document PiP với toolbar điều khiển',
    feat_controls: 'Tua ±10s · tốc độ · âm lượng · chuyển reel',
    feat_movie: 'Tra phim từ bình luận',
    feat_score: 'PiP Score (tương tác + cảm xúc)',
    tag_free: 'Free',
    tag_pro: 'PRO',
    activate_pro: 'Kích hoạt PRO',
    btn_activate: 'Kích hoạt',
    pro_active_title: 'PRO đã kích hoạt',
    btn_deactivate: 'Hủy',
    footer: 'Truy cập <strong>facebook.com</strong> và bấm nút <span class="footer-pip-badge">PiP</span> trên reel để bắt đầu.',
    plan_free: 'Free',
    plan_pro: '✦ PRO',
    msg_enter_key: 'Vui lòng nhập license key.',
    msg_success: 'Kích hoạt thành công! PRO đã được mở khóa.',
    upgrade_btn: 'Mua PRO',
    plan_trial: 'Dùng thử PRO · còn {hours}h',
    trial_active: 'Bạn đang dùng thử PRO miễn phí — còn {hours} giờ. Mua một lần để dùng mãi mãi.',
    trial_ended: 'Hết thời gian dùng thử PRO. Mua một lần ($29) để mở khoá lại mãi mãi.',
    have_key: 'Đã có key?',
    key_placeholder: 'Dán license key',
    license_valid_until: 'Hiệu lực đến {date}',
    license_lifetime: 'Vĩnh viễn',
    analytics_label: 'Gửi thống kê ẩn danh',
    quick_hide_label: 'Phím ẩn nhanh',
    shortcut_edit: 'Sửa',
    shortcut_unset: 'Chưa đặt',
    lic_err_network: 'Không kết nối được máy chủ license. Kiểm tra mạng rồi thử lại.',
    lic_err_limit: 'Key đã kích hoạt trên số máy tối đa. Tắt ở máy cũ rồi thử lại.',
    lic_err_not_found: 'Key không đúng. Kiểm tra lại email mua hàng.',
    lic_err_rate: 'Thử quá nhanh — đợi vài giây rồi thử lại.',
    lic_err_revoked: 'Key đã bị thu hồi hoặc hết hạn.',
    lic_err_generic: 'Không kích hoạt được. Thử lại sau.',
    lic_err_not_configured: 'Bản này chưa cấu hình bán hàng.',
    lang_label: 'Ngôn ngữ',
    skip_ads_label: 'Tự bỏ qua reel được tài trợ',
    auto_next_label: 'Tự động chuyển video',
  },
  en: {
    trigger_title: 'Open in Picture-in-Picture (PiP Booster)',
    trigger_aria: 'Open PiP',
    cinema_title: 'Cinema mode (fullscreen)',
    quick_score_tip: 'Engagement score: {score}/10 · shares {shares} · comments {comments}',
    score_viral: 'Viral',
    score_good: 'Hot',
    score_avg: 'Average',
    score_weak: 'Weak',
    score_vweak: 'Boring',
    score_na: '—',
    play_pause: 'Play/Pause',
    rewind: 'Rewind 10s',
    forward: 'Forward 10s',
    prev_video: 'Previous video',
    next_video: 'Next video',
    volume: 'Volume',
    download: 'Download (offline)',
    stop_record: 'Recording — click to stop & save',
    interested: 'Interested — show more like this',
    interested_done: 'Marked as Interested',
    not_interested: 'Not interested — skip this reel',
    not_interested_done: 'Marked as Not interested',
    action_failed: 'Could not complete — FB may have changed its menu',
    captions: 'Captions',
    cc_loading: 'Loading...',
    cc_unavailable: 'No captions for this reel',
    speed: 'Playback speed',
    size: 'Window size',
    pin: 'Pin window',
    unpin: 'Unpin',
    close: 'Close PiP',
    movie_lookup: 'Find movie',
    size_portrait: 'Portrait 9:16',
    size_square: 'Square 1:1',
    size_landscape: 'Landscape 16:9',
    score: 'PiP Score',
    pro_tooltip: 'PRO feature — Unlock in the extension popup',
    score_insufficient: 'Not enough data',
    error_generic: 'Error: {msg}',
    bd_engagement: 'Engagement',
    bd_sentiment: 'Sentiment',
    bd_dataquality: 'Data quality',
    dq_full: 'Full',
    dq_partial: 'Partial',
    dq_minimal: 'Minimal',
    dq_insufficient: 'Insufficient',
    bd_share_rate: 'Share rate',
    bd_comment_rate: 'Comment rate',
    bd_like_rate: 'Like rate',
    score_breakdown_title: 'PiP Score Breakdown',
    bd_views: 'Views',
    bd_likes: 'Likes',
    bd_comments: 'Comments',
    bd_shares: 'Shares',
    scanning: 'Scanning comments...',
    found_in_comments: 'Found in {n} comments',
    no_movie_found: 'No movie link or title found<br>in the comments.',
    no_comments: 'No comments could be read.<br>FB may not have loaded comments, or changed its layout.',
    yt_links: 'YouTube links ({n})',
    times: '{n}×',
    movie_titles: 'Suggested titles ({n})',
    scanned_comments: 'Scanned {n} comments',
    search_suffix: 'movie',
    pro_feature: 'PRO feature',
    pro_unlock: 'Unlock with a license key<br>in the extension popup.',
    popup_blocked: 'Could not open floating window — popup blocked. Allow popups for facebook.com then try again.',
    open_error: 'Failed to open PiP: {msg}',
    dpip_unsupported: 'Your browser does not support Document PiP. Chrome 116+ required.',
    features: 'Features',
    feat_pip: 'Document PiP with control toolbar',
    feat_controls: 'Seek ±10s · speed · volume · next/prev reel',
    feat_movie: 'Find movies from comments',
    feat_score: 'PiP Score (engagement + sentiment)',
    tag_free: 'Free',
    tag_pro: 'PRO',
    activate_pro: 'Activate PRO',
    btn_activate: 'Activate',
    pro_active_title: 'PRO activated',
    btn_deactivate: 'Deactivate',
    footer: 'Go to <strong>facebook.com</strong> and click the <span class="footer-pip-badge">PiP</span> button on a reel to start.',
    plan_free: 'Free',
    plan_pro: '✦ PRO',
    msg_enter_key: 'Please enter a license key.',
    msg_success: 'Activated! PRO unlocked.',
    upgrade_btn: 'Get PRO',
    plan_trial: 'PRO trial · {hours}h left',
    trial_active: 'You are on a free PRO trial — {hours}h left. Buy once to keep PRO forever.',
    trial_ended: 'Your PRO trial has ended. Buy once ($29) to unlock it forever.',
    have_key: 'Already have a key?',
    key_placeholder: 'Paste your license key',
    license_valid_until: 'Valid until {date}',
    license_lifetime: 'Lifetime',
    analytics_label: 'Share anonymous usage stats',
    quick_hide_label: 'Quick hide key',
    shortcut_edit: 'Edit',
    shortcut_unset: 'Not set',
    lic_err_network: 'Could not reach the license server. Check your connection and try again.',
    lic_err_limit: 'This key is active on the maximum number of devices. Deactivate one and retry.',
    lic_err_not_found: 'Key not found. Please check your purchase email.',
    lic_err_rate: 'Too many attempts — wait a few seconds and retry.',
    lic_err_revoked: 'This key has been revoked or has expired.',
    lic_err_generic: 'Activation failed. Please try again later.',
    lic_err_not_configured: 'Sales are not configured in this build.',
    lang_label: 'Language',
    skip_ads_label: 'Skip sponsored reels',
    auto_next_label: 'Auto-play next',
  },
};

/** Locale mặc định = tiếng Anh (user có thể tự đổi trong popup — được lưu lại). */
const DEFAULT_LOCALE = 'en';

let currentLocale = DEFAULT_LOCALE;

/** Đọc locale đã lưu từ storage (gọi 1 lần lúc khởi động). */
export async function initLocale() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const res = await chrome.storage.local.get(LOCALE_STORAGE_KEY);
      const saved = res[LOCALE_STORAGE_KEY];
      if (saved && LOCALES.includes(saved)) currentLocale = saved;
    }
  } catch { /* giữ mặc định */ }
  return currentLocale;
}

export function getLocale() {
  return currentLocale;
}

/** Đổi locale + lưu lại. */
export async function setLocale(loc) {
  if (!LOCALES.includes(loc)) return;
  currentLocale = loc;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [LOCALE_STORAGE_KEY]: loc });
    }
  } catch { /* noop */ }
}

/** Lấy chuỗi dịch; thay {name} bằng params.name. */
export function t(key, params) {
  const dict = MESSAGES[currentLocale] || MESSAGES.en;
  let str = dict[key] ?? MESSAGES.en[key] ?? key;
  if (params) {
    for (const k of Object.keys(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    }
  }
  return str;
}
