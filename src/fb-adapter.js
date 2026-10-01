/**
 * fb-adapter.js — Tất cả selector Facebook tập trung ở đây.
 * Khi FB đổi DOM, chỉ cần sửa file này.
 *
 * Chiến lược: bám aria-label, role, data-* ổn định.
 * TRÁNH class hash (css modules của FB thay đổi mỗi deploy).
 */

/** Tìm video element trong một reel container */
export function findVideoInReel(reelContainer) {
  // Reel thường là <video> trực tiếp hoặc trong div[data-visualcompletion]
  return reelContainer.querySelector('video');
}

/**
 * Tìm tất cả reel container đang visible trên trang.
 * FB Reels: thường nằm trong article[role="article"] hoặc div với aria-label chứa "Reel"
 */
export function findReelContainers() {
  const results = [];

  // Cách 1: article chứa video + có nút play/sound (đặc trưng reel)
  const articles = document.querySelectorAll('article[role="article"]');
  for (const article of articles) {
    const video = article.querySelector('video');
    if (video) results.push(article);
  }

  // Cách 2: Trang /reels/ — FB bọc từng reel trong div có data-pagelet
  if (results.length === 0) {
    const reelDivs = document.querySelectorAll('div[data-pagelet*="Reels"]');
    for (const div of reelDivs) {
      const video = div.querySelector('video');
      if (video) results.push(div);
    }
  }

  // Cách 3: fallback — bất kỳ video nào trên trang FB (watch, stories)
  if (results.length === 0) {
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      // Chỉ lấy video đủ to (reel), bỏ qua thumbnail preview nhỏ
      if (video.offsetWidth > 200) {
        results.push(video.parentElement || video);
      }
    }
  }

  return results;
}

/**
 * Parse số liệu engagement từ DOM của post.
 * Trả về object { views, likes, comments, shares } — null nếu không tìm thấy.
 *
 * Facebook hiện các số ở dạng: "1.2K", "5K", "100" — parse về số nguyên.
 */
export function parseEngagementStats(reelContainer) {
  // Số liệu (share/comment) ở action-bar NGOÀI container video. Thử container trước;
  // rỗng thì mở rộng lên ĐÚNG "thẻ reel" chứa số (không quét cả document → tránh lấy nhầm reel khác).
  const empty = (s) => s.views == null && s.likes == null && s.comments == null && s.shares == null;
  // 1) aria-label ngay trong container (hiếm)
  let stats = scanEngagement(reelContainer);
  // 2) 3 số action-bar ĐANG TRONG VIEWPORT = reel đang xem (robust nhất trên reel viewer ảo hoá)
  if (empty(stats)) stats = scanActionBarCounts(document);
  // 3) dự phòng: aria mở rộng theo thẻ reel
  if (empty(stats)) stats = scanEngagement(findEngagementScope(reelContainer));
  return stats;
}

/** Đếm nút text-thuần-số (action-bar) không nằm trong comment/node của mình. */
function countActionNumbers(root) {
  let c = 0;
  const btns = root.querySelectorAll('div[role="button"], span[role="button"]');
  for (const b of btns) {
    if (b.closest('[role="article"]') || b.closest(OWN_NODES_SELECTOR)) continue;
    if (/^\d[\d.,]*\s*(K|M|Tr|N)?$/i.test(b.textContent.trim())) {
      c++;
      if (c >= 2) return c;
    }
  }
  return c;
}

/** Element có đang hiển thị trong viewport không (reel ĐANG XEM). */
function isInViewport(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return true;
  const r = el.getBoundingClientRect();
  const vw = (typeof window !== 'undefined' && window.innerWidth) || 0;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 0;
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

/**
 * Đọc 3 số action-bar = [likes, comments, shares].
 * Reel viewer ảo hoá nhiều reel cùng lúc → ƯU TIÊN nút đang trong VIEWPORT
 * (đó là reel đang xem). Bỏ số trong comment + node của extension.
 */
function scanActionBarCounts(root) {
  const stats = { views: null, likes: null, comments: null, shares: null };
  const all = [];
  for (const b of root.querySelectorAll('div[role="button"], span[role="button"]')) {
    if (b.closest('[role="article"]') || b.closest(OWN_NODES_SELECTOR)) continue;
    if (!/^\d[\d.,]*\s*(K|M|Tr|N)?$/i.test(b.textContent.trim())) continue;
    all.push(b);
  }
  const visible = all.filter(isInViewport);
  const pick = visible.length >= 2 ? visible : all; // đủ số trong viewport → dùng, không thì fallback

  const nums = [];
  for (const b of pick) {
    const n = parseVnNumber(b.textContent.trim());
    if (n != null) {
      nums.push(n);
      if (nums.length >= 3) break;
    }
  }
  stats.likes = nums[0] ?? null;
  stats.comments = nums[1] ?? null;
  stats.shares = nums[2] ?? null;
  return stats;
}

/**
 * Đi lên tìm "thẻ reel" — ancestor gần nhất chứa action-bar CỦA CHÍNH reel này.
 * Nhận diện bằng: có aria-label share/comment, HOẶC ≥2 nút số (like/comment/share).
 * Dừng ở thẻ reel gần nhất → không lấy nhầm số của reel khác đang xếp chồng.
 */
function findEngagementScope(container) {
  const ARIA = '[aria-label*="chia sẻ" i], [aria-label*="bình luận" i], [aria-label*="share" i], [aria-label*="comment" i]';
  let el = container;
  for (let i = 0; i < 12 && el; i++) {
    if (el.querySelector) {
      if (el.querySelector(ARIA) || countActionNumbers(el) >= 2) return el;
    }
    el = el.parentElement;
  }
  return document;
}

/** Lấy số từ aria-label; nếu label không có số thì lấy từ textContent ("66", "1,2K"). */
function numFromEl(label, text) {
  const fromLabel = parseAriaNNumber(label);
  if (fromLabel != null) return fromLabel;
  const cleaned = (text || '').replace(/[^0-9.,KMkTrNtr]/gi, '');
  return parseVnNumber(cleaned);
}

function scanEngagement(reelContainer) {
  const stats = { views: null, likes: null, comments: null, shares: null };

  const allText = reelContainer.querySelectorAll('[aria-label]');
  for (const el of allText) {
    const label = el.getAttribute('aria-label') || '';
    const text = el.textContent.trim();

    if (stats.views == null && (/lượt xem|views/i.test(label) || /lượt xem|views/i.test(text))) {
      stats.views = numFromEl(label, text);
    }
    if (stats.likes == null && /lượt thích|thích|reactions|cảm xúc|like/i.test(label)) {
      stats.likes = numFromEl(label, text);
    }
    if (stats.comments == null && /bình luận|comment/i.test(label)) {
      stats.comments = numFromEl(label, text);
    }
    if (stats.shares == null && /chia sẻ|share/i.test(label)) {
      stats.shares = numFromEl(label, text);
    }
  }

  // Tìm thêm từ span chứa số (FB hay dùng span không có aria)
  const spans = reelContainer.querySelectorAll('span');
  for (const span of spans) {
    const t = span.textContent.trim();
    if (!t) continue;

    // Pattern: "1,2K" "500" "2,3Tr"
    if (/^\d[\d.,]*(K|M|Tr|N)?$/i.test(t)) {
      const num = parseVnNumber(t);
      if (num === null) continue;

      // Heuristic: số ngay sau icon like (SVG sibling)
      const prev = span.previousElementSibling;
      if (prev && prev.tagName === 'SVG') {
        if (!stats.likes) stats.likes = num;
      }
    }
  }

  return stats;
}

/** Parse "1.2K" → 1200, "5M" → 5000000, "1,2Tr" → 1200000 */
export function parseVnNumber(str) {
  if (!str) return null;
  const s = str.trim().replace(/\s/g, '');

  // Vietnamese: "1,2Tr" = 1.2 triệu, "5N" = 5 nghìn
  if (/Tr$/i.test(s)) return Math.round(parseFloat(s.replace(',', '.').replace(/Tr$/i, '')) * 1_000_000);
  if (/N$/i.test(s)) return Math.round(parseFloat(s.replace(',', '.').replace(/N$/i, '')) * 1_000);
  if (/K$/i.test(s)) return Math.round(parseFloat(s.replace(',', '.').replace(/K$/i, '')) * 1_000);
  if (/M$/i.test(s)) return Math.round(parseFloat(s.replace(',', '.').replace(/M$/i, '')) * 1_000_000);

  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : Math.round(n);
}

function parseAriaNNumber(label) {
  // "123 lượt thích" "1.234 reactions"
  const m = label.match(/^([\d.,]+[KMTrN]?)/i);
  return m ? parseVnNumber(m[1]) : null;
}

function parseRegularNumber(text) {
  // "1,200" hoặc "1.200" (dấu phân cách nghìn)
  const cleaned = text.replace(/[.,](?=\d{3})/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(n);
}

function parseNumber(str) {
  return parseVnNumber(str) || parseRegularNumber(str);
}

// alias để tương thích
function parseAriNumber(str) { return parseVnNumber(str); }
function parseFbNumber(str) { return parseVnNumber(str); }

/**
 * Tìm nút mở panel bình luận trên reel ("Bình luận" / "Comment").
 * Trên trang reel nút này nằm ở action-bar (ngoài container video) → quét document.
 */
export function findExpandCommentsButton(reelContainer) {
  const candidates = document.querySelectorAll('div[role="button"], span[role="button"], [role="button"]');
  for (const el of candidates) {
    if (el.closest(OWN_NODES_SELECTOR)) continue;
    const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
    const text = (el.textContent || '').trim().toLowerCase();
    // Chỉ nhắm nút TOGGLE mở panel — KHÔNG match ô soạn "Viết bình luận".
    if (
      text === 'bình luận' || text === 'comment' ||
      label === 'bình luận' || label === 'comment' ||
      text.includes('xem tất cả') || text.includes('view all comment')
    ) {
      return el;
    }
  }
  return null;
}

/** Selector loại trừ node do chính extension chèn vào trang. */
const OWN_NODES_SELECTOR = '.pipbooster-group, .pipbooster-trigger, .pipbooster-score, #pipbooster-debug-log';

/** Bỏ các element nằm trong node của extension (tránh scrape nhầm chính mình). */
function excludeOwnNodes(els) {
  return els.filter((el) => !el.closest(OWN_NODES_SELECTOR));
}

/**
 * Lấy tất cả comment element.
 * FB đánh dấu mỗi bình luận bằng aria-label "Bình luận của <tên>" / "Comment by <name>".
 * Trên trang reel bình luận có thể nằm ở panel riêng → quét cả document rồi lọc.
 */
export function getCommentElements(reelContainer) {
  // Feed: comment là article lồng trong post article.
  let els = Array.from(document.querySelectorAll('[role="article"] [role="article"]'));

  // Trang reel: post KHÔNG phải article → comment là article "phẳng" (top-level).
  if (els.length === 0) {
    els = Array.from(document.querySelectorAll('div[role="article"]'));
  }

  return excludeOwnNodes(els);
}

// ---------------------------------------------------------------------------
// Link "phần tiếp theo" — chủ kênh, link trong bình luận / mô tả
// ---------------------------------------------------------------------------

/** Số ký tự chữ đứng trước link được dùng để đọc "Phần 2:", "part 3 👉"… */
const LINK_CONTEXT_CHARS = 60;
const OWNER_LINK_SELECTOR = '[aria-label*="chủ sở hữu" i], [aria-label*="owner" i]';
const AUTHOR_BADGE_RE = /^(tác giả|author)$/i;
/** Leo tối đa N tầng từ link chủ kênh để tìm khối mô tả reel (không leo ra cả trang). */
const CAPTION_MAX_LEVELS = 6;
const CAPTION_MAX_TEXT = 2000;
const NOT_PROFILE_PATHS = new Set(['reel', 'reels', 'watch', 'share', 'videos', 'groups', 'events', 'hashtag', 'l.php', 'stories', 'photo', 'photos']);

/** Id reel đang xem (từ URL) — để bỏ link trỏ về chính nó. */
export function getCurrentReelId() {
  try {
    const m = location.pathname.match(/\/reel\/(\d+)/);
    return m ? m[1] : new URLSearchParams(location.search).get('v');
  } catch {
    return null;
  }
}

/** Khoá nhận diện trang cá nhân từ href: "id:123" (profile.php) hoặc "username". */
function profileKey(href) {
  try {
    const u = new URL(href, 'https://www.facebook.com');
    if (!/(^|\.)facebook\.com$/i.test(u.hostname)) return null;
    if (u.pathname === '/profile.php') return u.searchParams.get('id') ? 'id:' + u.searchParams.get('id') : null;
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg && !NOT_PROFILE_PATHS.has(seg.toLowerCase()) ? seg.toLowerCase() : null;
  } catch {
    return null;
  }
}

function findOwnerLink() {
  try {
    return document.querySelector(OWNER_LINK_SELECTOR);
  } catch {
    return null;
  }
}

/**
 * Mọi link trong `root` kèm đoạn chữ đứng ngay trước nó (sau link trước đó).
 * @returns {Array<{ href: string, context: string }>}
 */
export function getLinksWithContext(root) {
  const out = [];
  let text = '';
  let lastEnd = 0;
  const walk = (node) => {
    if (node.nodeType === 3) { text += node.nodeValue; return; }
    if (node.nodeType !== 1 || node.closest?.(OWN_NODES_SELECTOR)) return;
    if (node.tagName === 'A' && node.getAttribute('href')) {
      out.push({ href: node.href || node.getAttribute('href'), context: text.slice(Math.max(lastEnd, text.length - LINK_CONTEXT_CHARS)) });
      text += node.textContent;
      lastEnd = text.length;
      return;
    }
    node.childNodes.forEach(walk);
  };
  try { walk(root); } catch { /* DOM lạ — bỏ qua */ }
  return out;
}

/** Bình luận này của chủ reel? (badge "Tác giả"/"Author", hoặc cùng trang cá nhân với chủ reel) */
export function isCommentByReelOwner(commentEl) {
  try {
    const badge = [...commentEl.querySelectorAll('span, div')]
      .some((el) => el.childElementCount === 0 && AUTHOR_BADGE_RE.test(el.textContent.trim()));
    if (badge) return true;
    const owner = findOwnerLink();
    const ownerKey = owner && profileKey(owner.href || owner.getAttribute('href'));
    const authorLink = commentEl.querySelector('a[href]');
    return !!ownerKey && !!authorLink && profileKey(authorLink.href || authorLink.getAttribute('href')) === ownerKey;
  } catch {
    return false;
  }
}

/** Khối mô tả reel (tên chủ kênh + caption) — leo từ link chủ kênh lên vài tầng. */
export function getReelCaptionBlock() {
  const owner = findOwnerLink();
  let el = owner && owner.parentElement;
  for (let i = 0; el && i < CAPTION_MAX_LEVELS; i++, el = el.parentElement) {
    const len = (el.textContent || '').length;
    if (len > CAPTION_MAX_TEXT) return null; // leo quá → đã ra khỏi khối mô tả
    if (el.querySelectorAll('a[href]').length > 2 && len > 30) return el;
  }
  return null;
}

/**
 * Lấy text nội dung của comment element.
 * Ưu tiên div[dir="auto"] (FB dùng cho nội dung comment); fallback sang span.
 */
export function getCommentText(commentEl) {
  const texts = [];

  // FB đặt nội dung comment trong div[dir="auto"]
  const dirNodes = commentEl.querySelectorAll('div[dir="auto"]');
  for (const node of dirNodes) {
    const t = node.textContent.trim();
    if (t) texts.push(t);
  }

  // Fallback: span không phải reaction/timestamp
  if (texts.length === 0) {
    const spans = commentEl.querySelectorAll('span:not([aria-hidden])');
    for (const sp of spans) {
      const t = sp.textContent.trim();
      if (t && !/^\d+\s*(giờ|phút|giây|h|m|s|w|d|ngày|tuần)$/.test(t)) {
        texts.push(t);
      }
    }
  }

  return texts.join(' ').trim();
}
