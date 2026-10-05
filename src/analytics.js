/**
 * analytics.js — Thống kê sử dụng ẩn danh qua PostHog (không SDK: MV3 cấm code từ xa).
 *
 * - Content/popup gọi track() → chuyển cho background (1 nơi duy nhất gọi mạng).
 * - Chỉ gửi sự kiện trong ALLOWED_EVENTS + thuộc tính kỹ thuật (version, locale,
 *   plan). KHÔNG gửi URL, nội dung Facebook hay thông tin cá nhân.
 * - distinct_id = ID ngẫu nhiên của bản cài; tắt profile người dùng trên PostHog.
 * - User tắt được trong popup (STORAGE_KEYS.analyticsOptOut).
 */

import { STORAGE_KEYS } from './storage-keys.js';
import { PRODUCT_CONFIG } from './product-config.js';

export const TRACK_MESSAGE = 'pb_track';

export const ALLOWED_EVENTS = new Set([
  'extension_installed',
  'extension_updated',
  'pip_opened',
  'cinema_opened',
  'reel_navigated',
  'movie_lookup_used',
  'captions_opened',
  'reel_feedback_sent',
  'download_started',
  'paywall_viewed',
  'upgrade_clicked',
  'license_activated',
  'license_activation_failed',
  'license_deactivated',
  'quick_hide_used',
  'trial_started',
  'content_loaded',
  'content_error',
  'content_unreachable',
  'reel_skipped_boring',
  'review_prompt_shown',
  'review_prompt_answered',
  'yt_tool_used',
]);

/** Thuộc tính cho phép: chỉ chuỗi ngắn / số / boolean, key trong danh sách. */
const ALLOWED_PROPS = new Set(['feature', 'reason', 'direction', 'surface', 'kind', 'platform']);
const MAX_PROP_LEN = 40;

function sanitizeProps(props) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (!ALLOWED_PROPS.has(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string') out[k] = v.slice(0, MAX_PROP_LEN);
  }
  return out;
}

/** Gọi từ content script / popup. Không bao giờ throw, không chặn UI. */
export function track(event, props) {
  try {
    if (!ALLOWED_EVENTS.has(event)) return;
    chrome.runtime.sendMessage({ type: TRACK_MESSAGE, event, props: sanitizeProps(props) }).catch(() => {});
  } catch { /* extension context invalidated (sau khi reload) — bỏ qua */ }
}

/**
 * Chỉ background gọi: gửi 1 sự kiện lên PostHog.
 * @param {{ installId: string, plan: string }} ctx
 */
export async function sendEvent(event, props, ctx) {
  if (!PRODUCT_CONFIG.posthogProjectKey || !ALLOWED_EVENTS.has(event)) return;
  const optOut = (await chrome.storage.local.get(STORAGE_KEYS.analyticsOptOut))[STORAGE_KEYS.analyticsOptOut];
  if (optOut) return;

  try {
    await fetch(PRODUCT_CONFIG.posthogHost + '/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: PRODUCT_CONFIG.posthogProjectKey,
        event,
        distinct_id: ctx.installId,
        properties: {
          ...sanitizeProps(props),
          $process_person_profile: false,
          version: chrome.runtime.getManifest().version,
          locale: (navigator.language || '').slice(0, 10),
          plan: ctx.plan,
        },
      }),
    });
  } catch { /* offline — bỏ qua, thống kê không quan trọng bằng trải nghiệm */ }
}
