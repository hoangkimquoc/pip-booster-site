/**
 * product-config.js — Thông số bán hàng + thống kê (KHÔNG phải secret: đều là
 * giá trị public, dùng được từ client).
 *
 * `node build.js`           → Polar SANDBOX (tiền giả, test)
 * `node build.js --release` → build tự đổi USE_PRODUCTION = true (bán thật)
 * Popup/background đọc file này trực tiếp (không qua bundle) nên bản zip phát
 * hành phải lấy từ thư mục release — xem docs/polar-posthog-setup-guide.md.
 */

const USE_PRODUCTION = false;

const POLAR_SANDBOX = {
  polarApiBase: 'https://sandbox-api.polar.sh',
  polarOrganizationId: 'ec1dddf4-5f4c-43c6-b563-1de7ef97d852',
  polarCheckoutUrl: 'https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_HqArm6LVoNJ9fOcwraAiwkCgnGFhNzw0mVS0U0Ci1c6/redirect',
};

const POLAR_PRODUCTION = {
  polarApiBase: 'https://api.polar.sh',
  polarOrganizationId: '8384ae98-5b72-4c8c-8a96-9c140f5c284b',
  polarCheckoutUrl: 'https://buy.polar.sh/polar_cl_VhT8J2mt26Sa3eNY66IMgWEqcHpRyMsOtiOFi4Nu2Fy',
};

/**
 * Tải video: TẮT (rủi ro chính sách bản quyền của Chrome Web Store).
 * Bản release còn loại hẳn code tải khỏi bundle (build.js RELEASE_EXCLUDE).
 */
const ENABLE_DOWNLOAD = false;

export const PRODUCT_CONFIG = {
  ...(USE_PRODUCTION ? POLAR_PRODUCTION : POLAR_SANDBOX),
  features: { download: ENABLE_DOWNLOAD },

  /** PostHog → Project settings → Project API key (phc_...). Trống = tắt thống kê. */
  posthogProjectKey: '',
  /** https://us.i.posthog.com hoặc https://eu.i.posthog.com (theo region project) */
  posthogHost: 'https://us.i.posthog.com',
};
