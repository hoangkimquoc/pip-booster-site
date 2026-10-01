/**
 * comment-scraper.js — Quét bình luận Facebook để tìm link YouTube và tên phim.
 *
 * Chạy hoàn toàn client-side, không gọi API ngoài.
 * Giai đoạn 1: regex + heuristic tần suất/like.
 */

import { findExpandCommentsButton, getCommentElements, getCommentText } from './fb-adapter.js';

// --- Regex patterns ---

/** Khớp link YouTube đầy đủ: youtube.com/watch?v=... hoặc youtu.be/... */
const YOUTUBE_URL_RE = /https?:\/\/(www\.)?(youtube\.com\/watch\?[^\s"'<>]*v=[\w-]+|youtu\.be\/[\w-]+)[^\s"'<>]*/gi;
/** ID video YouTube hợp lệ: đúng 11 ký tự [A-Za-z0-9_-]. Chặn chuỗi độc chèn qua bình luận. */
const YT_ID_RE = /^[\w-]{11}$/;
const MAX_RESULTS = 10;
const EXPAND_COMMENTS_WAIT_MS = 1500;

/**
 * Heuristic tên phim tiếng Việt/Anh:
 * - Chữ hoa đầu từ, 2–6 từ liên tiếp, VD: "Hoàng Tử Bé", "The Dark Knight"
 * - Từ trong dấu ngoặc kép: "Tên phim"
 * - Từ sau "phim:", "xem phim", "tên phim là", "tập phim"
 */
const QUOTED_TITLE_RE = /["«»""„‟]([^"«»""„‟]{3,60})["«»""„‟]/g;

const TITLE_TRIGGER_RE =
  /(?:phim[:\s]+|xem phim[:\s]+|tên phim[:\s]+|tập phim[:\s]+|series[:\s]+|bộ phim[:\s]+|link phim[:\s]*)([\w\sÀ-ɏḀ-ỿ]{3,60})/gi;

/** Tên phim dạng viết hoa (Title Case): "The Dark Knight", "Hoàng Tử Bé" */
const TITLE_CASE_RE = /\b([A-ZÀ-ÖØ-öø-ÿÀ-ỹ][a-zà-öø-ÿà-ỹ]+(?:\s+[A-ZÀ-ÖØ-öø-ÿÀ-ỹ][a-zà-öø-ÿà-ỹ]+){1,5})\b/g;

/**
 * Kết quả trả về của scrapeMovieInfo():
 * {
 *   youtubeLinks: [{ url, videoId, count, totalLikes }],
 *   movieTitles:  [{ title, count, totalLikes }],
 *   totalCommentsScanned: number,
 *   commentsWithHits: number,
 * }
 */
export async function scrapeMovieInfo(reelContainer) {
  const commentEls = await collectComments(reelContainer);
  const comments = extractCommentData(commentEls);

  // KHÔNG fallback quét toàn trang (sẽ nhặt rác: UI, node của extension...).
  // 0 comment → trả kết quả rỗng, UI báo trung thực.
  return parseFromComments(comments);
}

/** Lấy comment elements; nếu chưa có thì click mở panel bình luận rồi chờ. */
async function collectComments(reelContainer) {
  let els = getCommentElements(reelContainer);
  if (els.length > 0) return els;

  // Chưa render → mở panel bình luận
  await tryExpandComments(reelContainer);
  els = getCommentElements(reelContainer);
  return els;
}

/** Thử bấm nút "Xem tất cả bình luận" */
async function tryExpandComments(reelContainer) {
  const btn = findExpandCommentsButton(reelContainer);
  if (!btn) return;

  btn.click();
  // Chờ DOM cập nhật (comment lazy-load)
  await sleep(EXPAND_COMMENTS_WAIT_MS);
}

/** Lấy { text, likes } từ mỗi comment element */
function extractCommentData(commentEls) {
  return commentEls.map(el => {
    const text = getCommentText(el);
    // Tìm số like của comment (aria-label trên nút reaction)
    const likeBtn = el.querySelector('[aria-label*="lượt thích"], [aria-label*="reaction"]');
    const likesText = likeBtn ? likeBtn.getAttribute('aria-label') : '';
    const likesMatch = likesText.match(/^(\d+)/);
    const likes = likesMatch ? parseInt(likesMatch[1], 10) : 0;
    return { text, likes };
  }).filter(c => c.text.length > 0);
}

/** Parse từ danh sách comment có cấu trúc */
function parseFromComments(comments) {
  const ytMap = new Map(); // url → { url, title, count, totalLikes }
  const titleMap = new Map(); // title_lower → { title, count, totalLikes }
  let commentsWithHits = 0;

  for (const { text, likes } of comments) {
    let hasHit = false;

    // Tìm YouTube links
    const ytMatches = [...text.matchAll(YOUTUBE_URL_RE)];
    for (const m of ytMatches) {
      const videoId = extractYtVideoId(m[0]);
      if (!videoId) continue; // link méo / cố tình chèn mã → bỏ
      const existing = ytMap.get(videoId) || {
        url: `https://www.youtube.com/watch?v=${videoId}`, videoId, count: 0, totalLikes: 0,
      };
      existing.count++;
      existing.totalLikes += likes;
      ytMap.set(videoId, existing);
      hasHit = true;
    }

    // Tìm tên phim (trích dẫn ngoặc kép)
    const quotedMatches = [...text.matchAll(QUOTED_TITLE_RE)];
    for (const m of quotedMatches) {
      addTitle(titleMap, m[1].trim(), likes);
      hasHit = true;
    }

    // Tìm tên phim sau trigger words (TITLE_TRIGGER_RE có 1 capture group → m[1])
    const triggerMatches = [...text.matchAll(TITLE_TRIGGER_RE)];
    for (const m of triggerMatches) {
      addTitle(titleMap, m[1].trim(), likes);
      hasHit = true;
    }

    if (hasHit) commentsWithHits++;
  }

  return buildResult(ytMap, titleMap, comments.length, commentsWithHits);
}

function addTitle(map, raw, likes) {
  if (!raw || raw.length < 2 || raw.length > 80) return;
  // Chuẩn hóa: trim, loại bỏ ký tự thừa
  const title = raw.replace(/[^\w\sÀ-ɏḀ-ỿ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!title) return;
  const key = title.toLowerCase();
  const existing = map.get(key) || { title, count: 0, totalLikes: 0 };
  existing.count++;
  existing.totalLikes += likes;
  map.set(key, existing);
}

function buildResult(ytMap, titleMap, totalScanned, withHits) {
  // Sắp xếp: ưu tiên count cao, ties → totalLikes cao
  const youtubeLinks = [...ytMap.values()].sort(
    (a, b) => b.count - a.count || b.totalLikes - a.totalLikes
  );
  const movieTitles = [...titleMap.values()].sort(
    (a, b) => b.count - a.count || b.totalLikes - a.totalLikes
  );

  return {
    youtubeLinks: youtubeLinks.slice(0, MAX_RESULTS),
    movieTitles: movieTitles.slice(0, MAX_RESULTS),
    totalCommentsScanned: totalScanned,
    commentsWithHits: withHits,
  };
}

/** Lấy video ID từ link YouTube; null nếu không phải ID hợp lệ. */
export function extractYtVideoId(raw) {
  try {
    const url = new URL(raw);
    const id = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : url.searchParams.get('v');
    return id && YT_ID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Trả về danh sách comment { text, likes } cho pip-score tính sentiment.
 * (Re-export để content.js có thể dùng chung kết quả scrape)
 */
export async function getCommentsForSentiment(reelContainer) {
  const commentEls = await collectComments(reelContainer);
  return extractCommentData(commentEls);
}
