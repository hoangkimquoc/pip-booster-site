/**
 * storage-keys.js — Nguồn duy nhất cho key chrome.storage.local.
 * Dùng chung content bundle + popup + background (import trực tiếp ES module).
 */

export const STORAGE_KEYS = {
  license: 'pip_booster_license',
  locale: 'pip_booster_locale',
  skipAds: 'pip_booster_skip_ads',
  autoNext: 'pip_booster_auto_next',
  /** ID ngẫu nhiên của bản cài — nhãn thiết bị khi kích hoạt key + distinct_id ẩn danh */
  installId: 'pip_booster_install_id',
  analyticsOptOut: 'pip_booster_analytics_opt_out',
  /** Dùng thử PRO 24h — lưu cả local + sync (xem trial.js) */
  trial: 'pip_booster_trial',
};
