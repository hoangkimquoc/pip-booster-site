/**
 * platform.js — Chọn hợp đồng nền tảng theo tên miền trang hiện tại.
 * Thêm nền tảng mới: tạo platform-<ten>.js (cùng shape) rồi đăng ký vào PLATFORMS.
 */

import { facebookPlatform } from './platform-facebook.js';
import { youtubePlatform } from './platform-youtube.js';
import { netflixPlatform } from './platform-netflix.js';

const PLATFORMS = [facebookPlatform, youtubePlatform, netflixPlatform];
let currentPlatform = null;

/** Nền tảng của trang hiện tại (mặc định Facebook khi không xác định được, VD môi trường test). */
export function getPlatform() {
  if (!currentPlatform) {
    // __pbPlatformHost: chỉ harness test layout đặt (giả lập tên miền), bản thật không có
    const host = globalThis.__pbPlatformHost || (typeof location !== 'undefined' ? location.hostname : '');
    currentPlatform = PLATFORMS.find((p) => p.matches(host)) || facebookPlatform;
  }
  return currentPlatform;
}

/** Nền tảng hiện tại có hỗ trợ tính năng này không (score, autoNext, skipAds…). */
export function platformSupports(feature) {
  return !!getPlatform().features[feature];
}
