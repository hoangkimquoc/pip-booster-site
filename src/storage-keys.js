/**
 * storage-keys.js — Nguồn duy nhất cho key chrome.storage.local.
 * Dùng chung content bundle + popup + background (import trực tiếp ES module).
 */

export const STORAGE_KEYS = {
  license: 'pip_booster_license',
  locale: 'pip_booster_locale',
  skipAds: 'pip_booster_skip_ads',
  autoNext: 'pip_booster_auto_next',
  skipBoring: 'pip_booster_skip_boring',
  /** ID ngẫu nhiên của bản cài — nhãn thiết bị khi kích hoạt key + distinct_id ẩn danh */
  installId: 'pip_booster_install_id',
  analyticsOptOut: 'pip_booster_analytics_opt_out',
  /** Dùng thử PRO 24h — lưu cả local + sync (xem trial.js) */
  trial: 'pip_booster_trial',
  /** Mời đánh giá store: { uses, asks, nextAskAt, done } (xem review-prompt.js) */
  reviewPrompt: 'pip_booster_review_prompt',
  /** PRO: tự bỏ qua đoạn tài trợ YouTube (SponsorBlock). Chưa đặt = BẬT */
  ytSkipSponsors: 'pip_booster_yt_skip_sponsors',
  /** PRO: tốc độ phát nhớ theo kênh YouTube { [channel]: rate } */
  ytChannelSpeed: 'pip_booster_yt_channel_speed',
  /** PRO: Netflix tự bỏ intro/recap + tự sang tập kế. Chưa đặt = BẬT */
  nfAutoSkip: 'pip_booster_nf_auto_skip',
  /** PRO: kích thước cửa sổ PiP đã nhớ { "youtube:landscape": {width,height} } */
  pipSizes: 'pip_booster_pip_sizes',
  /** PRO (beta): tự mở PiP khi chuyển tab. Mặc định TẮT */
  autoPip: 'pip_booster_auto_pip',
};
