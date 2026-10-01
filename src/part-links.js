/**
 * part-links.js — Nhận diện link "phần tiếp theo" (part 2, phần 3, tập 4…) mà chủ
 * kênh dán trong bình luận / mô tả reel. Hàm thuần (không DOM) để test được.
 *
 * Quy tắc tin cậy:
 *  - Link của CHỦ KÊNH (bình luận có author = chủ reel, hoặc trong mô tả) → luôn lấy.
 *  - Link của người khác → chỉ lấy khi cùng bình luận có ghi số phần (tránh spam).
 *  - Bỏ link trỏ về chính reel đang xem / link timestamp bình luận (?comment_id=).
 */

/** Đường dẫn video Facebook → id video (hoặc mã rút gọn). */
const FB_VIDEO_PATHS = [
  /^\/reel\/(\d+)/,
  /^\/(?:[^/]+\/)?videos\/(?:[^/]+\/)?(\d+)/,
  /^\/share\/[rv]\/([\w-]+)/,
  /^\/watch\/?$/,
];
const FB_HOSTS = /(^|\.)facebook\.com$|^fb\.watch$/i;

/**
 * Số phần trong đoạn chữ: "part 2", "Phần 3", "tập 4", "P5", "pt.6", "#2"?(không).
 * "phần cuối"/"final"/"end" → FINAL_PART (xếp cuối).
 */
const PART_RE = /(?:^|[^\p{L}])(?:part|phần|phan|tập|tap|pt|p)\s*[.:#-]?\s*(\d{1,3})(?!\d)/iu;
const FINAL_RE = /(?:phần|tập|part)\s*(?:cuối|final|kết|end)|\b(?:final|last) part\b/iu;
export const FINAL_PART = 999;

export function detectPartNumber(text) {
  if (!text) return null;
  if (FINAL_RE.test(text)) return FINAL_PART;
  const m = text.match(PART_RE);
  return m ? Number(m[1]) : null;
}

/**
 * Chuẩn hoá link video Facebook. Gỡ lớp chuyển hướng l.facebook.com/l.php?u=…
 * @returns {{ url: string, id: string }|null} null nếu không phải link video FB
 */
export function normalizeFbVideoLink(href) {
  let u;
  try { u = new URL(href, 'https://www.facebook.com'); } catch { return null; }
  if (/^l[m]?\.facebook\.com$/i.test(u.hostname) && u.searchParams.get('u')) {
    return normalizeFbVideoLink(u.searchParams.get('u'));
  }
  if (!/^https?:$/.test(u.protocol) || !FB_HOSTS.test(u.hostname)) return null;
  if (u.searchParams.has('comment_id')) return null; // link giờ đăng bình luận

  if (/^fb\.watch$/i.test(u.hostname)) {
    const code = u.pathname.slice(1).split('/')[0];
    return code ? { url: `https://fb.watch/${code}/`, id: 'fbw:' + code } : null;
  }
  for (const re of FB_VIDEO_PATHS) {
    const m = u.pathname.match(re);
    if (!m) continue;
    if (re.source.includes('watch')) {
      const v = u.searchParams.get('v');
      return v && /^\d+$/.test(v) ? { url: `https://www.facebook.com/watch/?v=${v}`, id: v } : null;
    }
    const id = m[1];
    const url = u.pathname.startsWith('/share/')
      ? `https://www.facebook.com${u.pathname.replace(/\/$/, '')}/`
      : `https://www.facebook.com/reel/${id}`;
    return { url, id };
  }
  return null;
}

/**
 * Gom link phần tiếp theo từ các nguồn (bình luận + mô tả).
 * Mỗi link có `context` = đoạn chữ ngay trước nó → "Phần 2: link1 · Phần 3: link2"
 * gán đúng số phần cho từng link; không thấy thì dùng số phần của cả bình luận.
 * @param {Array<{ text: string, links: Array<{ href: string, context?: string }>, fromAuthor: boolean }>} sources
 * @param {string|null} currentId id reel đang xem (bỏ qua link trỏ về chính nó)
 * @returns {Array<{ url: string, part: number|null, fromAuthor: boolean, count: number }>}
 */
export function collectPartLinks(sources, currentId) {
  const map = new Map();
  for (const src of sources) {
    const commentPart = detectPartNumber(src.text);
    for (const { href, context } of src.links) {
      const part = detectPartNumber(context) ?? commentPart;
      if (!src.fromAuthor && part == null) continue; // người lạ không ghi số phần → bỏ
      const link = normalizeFbVideoLink(href);
      if (!link || link.id === currentId) continue;
      const prev = map.get(link.id);
      if (prev) {
        prev.count++;
        prev.fromAuthor = prev.fromAuthor || src.fromAuthor;
        if (prev.part == null) prev.part = part;
      } else {
        map.set(link.id, { url: link.url, part, fromAuthor: src.fromAuthor, count: 1 });
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    (b.fromAuthor - a.fromAuthor)
    || ((a.part ?? FINAL_PART + 1) - (b.part ?? FINAL_PART + 1))
    || (b.count - a.count));
}
