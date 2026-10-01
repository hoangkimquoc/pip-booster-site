/**
 * pip-score.js — Tính PiP Score (0–10) từ engagement stats + sentiment comments.
 *
 * Công thức:
 *   RATE_SCORE = share_rate × 4 + comment_rate × 3 + like_rate × 2 + view_bonus × 1 (tổng tối đa ~10 trước chuẩn hóa)
 *   share_rate = shares / views  (nặng nhất — share = hành động mạnh nhất)
 *   comment_rate = comments / views
 *   like_rate = likes / views
 *   view_bonus: 1 nếu views > 100k, 0.5 nếu > 10k, 0 nếu dưới
 *
 *   SENTIMENT_SCORE = clamp(avg_weighted_sentiment / 5, -1, 1) × 2  → [-2, +2]
 *   (weighted = sentiment × like_weight của comment)
 *
 *   PIP_SCORE = clamp(RATE_SCORE + SENTIMENT_SCORE, 0, 10)
 */

import { scoreSentiment } from './sentiment-lexicon.js';

const RATE_THRESHOLDS = {
  // Tỉ lệ share "tốt" cho nội dung viral = 1% (1 share / 100 views)
  SHARE_GOOD: 0.01,
  // Tỉ lệ comment tốt = 2%
  COMMENT_GOOD: 0.02,
  // Tỉ lệ like tốt = 5%
  LIKE_GOOD: 0.05,
};

/**
 * Tính PiP Score đầy đủ.
 *
 * @param {object} engStats - { views, likes, comments, shares } (null = thiếu dữ liệu)
 * @param {Array<{text: string, likes: number}>} commentItems - danh sách comment với số like
 * @returns {{ score: number|null, breakdown: object, dataQuality: string }}
 */
export function calcPipScore(engStats, commentItems = []) {
  const { views, likes, comments, shares } = engStats || {};

  // Thiếu views (reel theater FB không expose views) → fallback tỉ lệ tương đối.
  // Case chính khi xem phim trên reel: chỉ có like/comment/share, không có views.
  if (!views || views === 0) {
    if (likes && (comments != null || shares != null)) {
      return calcFromEngagementRatio({ likes, comments, shares }, commentItems);
    }
    return {
      score: null,
      breakdown: {},
      dataQuality: 'insufficient',
      message: 'Chưa đủ dữ liệu để chấm',
    };
  }

  // --- Tính RATE_SCORE ---
  const shareRate = shares != null ? shares / views : null;
  const commentRate = comments != null ? comments / views : null;
  const likeRate = likes != null ? likes / views : null;

  let rateScore = 0;
  let rateComponents = {};

  if (shareRate !== null) {
    // Chuẩn hóa: shareRate / SHARE_GOOD × 4 (max 4 điểm), capped tại 4
    const s = Math.min((shareRate / RATE_THRESHOLDS.SHARE_GOOD) * 4, 4);
    rateScore += s;
    rateComponents.share = { rate: shareRate, contribution: s };
  }
  if (commentRate !== null) {
    const s = Math.min((commentRate / RATE_THRESHOLDS.COMMENT_GOOD) * 3, 3);
    rateScore += s;
    rateComponents.comment = { rate: commentRate, contribution: s };
  }
  if (likeRate !== null) {
    const s = Math.min((likeRate / RATE_THRESHOLDS.LIKE_GOOD) * 2, 2);
    rateScore += s;
    rateComponents.like = { rate: likeRate, contribution: s };
  }

  // View bonus (1 điểm max)
  let viewBonus = 0;
  if (views >= 1_000_000) viewBonus = 1;
  else if (views >= 100_000) viewBonus = 0.7;
  else if (views >= 10_000) viewBonus = 0.4;
  else if (views >= 1_000) viewBonus = 0.1;
  rateScore += viewBonus;

  // Chuẩn hóa rateScore về [0, 8] (để sentiment có thể ±2)
  const maxRateScore = 4 + 3 + 2 + 1; // = 10 lý thuyết
  const rateNormalized = Math.min((rateScore / maxRateScore) * 8, 8);

  // --- Tính SENTIMENT_SCORE ---
  let sentimentScore = 0;
  let sentimentBreakdown = { positive: 0, negative: 0, analyzed: 0 };

  if (commentItems.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of commentItems) {
      const { score } = scoreSentiment(item.text);
      if (score === 0) continue;

      // Like weight: comment 0 like = weight 1, 10 like = weight 2, 100+ like = weight 3
      const likeWeight = Math.min(1 + Math.log10(1 + (item.likes || 0)), 3);
      weightedSum += score * likeWeight;
      totalWeight += likeWeight;

      if (score > 0) sentimentBreakdown.positive++;
      else sentimentBreakdown.negative++;
      sentimentBreakdown.analyzed++;
    }

    if (totalWeight > 0) {
      const avgSentiment = weightedSum / totalWeight;
      // clamp avgSentiment vào [-5, 5] rồi map sang [-2, 2]
      sentimentScore = Math.max(-2, Math.min(2, (avgSentiment / 5) * 2));
    }
  }

  // --- Final score ---
  const rawScore = rateNormalized + sentimentScore;
  const finalScore = Math.max(0, Math.min(10, rawScore));

  // Đánh giá chất lượng dữ liệu
  const fieldsAvailable = [views, likes, comments, shares].filter(v => v != null).length;
  const dataQuality = fieldsAvailable === 4 ? 'full' : fieldsAvailable >= 2 ? 'partial' : 'minimal';

  return {
    score: Math.round(finalScore * 10) / 10,
    breakdown: {
      rateScore: Math.round(rateNormalized * 10) / 10,
      sentimentScore: Math.round(sentimentScore * 10) / 10,
      rateComponents,
      viewBonus,
      sentiment: sentimentBreakdown,
    },
    dataQuality,
    message: null,
  };
}

/**
 * Fallback khi KHÔNG có views (reel theater FB) — chấm bằng tỉ lệ tương đối.
 * Ý tưởng: phim hay → tỉ lệ share/like và comment/like cao (người xem chủ động
 * lan truyền + thảo luận), cộng độ lớn tuyệt đối của like.
 */
function calcFromEngagementRatio({ likes, comments, shares }, commentItems = []) {
  const RATIOS = { SHARE_OVER_LIKE_GOOD: 0.08, COMMENT_OVER_LIKE_GOOD: 0.04 };
  let rateScore = 0;
  const rateComponents = {};

  if (shares != null) {
    const r = shares / likes;
    const s = Math.min((r / RATIOS.SHARE_OVER_LIKE_GOOD) * 4, 4);
    rateScore += s;
    rateComponents.shareOverLike = { rate: r, contribution: s };
  }
  if (comments != null) {
    const r = comments / likes;
    const s = Math.min((r / RATIOS.COMMENT_OVER_LIKE_GOOD) * 3, 3);
    rateScore += s;
    rateComponents.commentOverLike = { rate: r, contribution: s };
  }

  // Độ lớn like tuyệt đối (max 1)
  let likeBonus = 0;
  if (likes >= 100_000) likeBonus = 1;
  else if (likes >= 10_000) likeBonus = 0.7;
  else if (likes >= 1_000) likeBonus = 0.4;
  else if (likes >= 100) likeBonus = 0.1;
  rateScore += likeBonus;

  const rateNormalized = Math.min((rateScore / 8) * 8, 8);

  // Sentiment (tái dùng cùng cách tính trọng số like)
  let sentimentScore = 0;
  const sentimentBreakdown = { positive: 0, negative: 0, analyzed: 0 };
  if (commentItems.length > 0) {
    let weightedSum = 0, totalWeight = 0;
    for (const item of commentItems) {
      const { score } = scoreSentiment(item.text);
      if (score === 0) continue;
      const likeWeight = Math.min(1 + Math.log10(1 + (item.likes || 0)), 3);
      weightedSum += score * likeWeight;
      totalWeight += likeWeight;
      score > 0 ? sentimentBreakdown.positive++ : sentimentBreakdown.negative++;
      sentimentBreakdown.analyzed++;
    }
    if (totalWeight > 0) sentimentScore = Math.max(-2, Math.min(2, (weightedSum / totalWeight / 5) * 2));
  }

  const finalScore = Math.max(0, Math.min(10, rateNormalized + sentimentScore));
  const fieldsAvailable = [likes, comments, shares].filter(v => v != null).length;

  return {
    score: Math.round(finalScore * 10) / 10,
    breakdown: {
      rateScore: Math.round(rateNormalized * 10) / 10,
      sentimentScore: Math.round(sentimentScore * 10) / 10,
      rateComponents,
      likeBonus,
      sentiment: sentimentBreakdown,
      mode: 'no-views',
    },
    dataQuality: fieldsAvailable === 3 ? 'full' : 'partial',
    message: null,
  };
}

/**
 * Quick score (0–10) để LIẾC NHANH — không cần mở PiP/comment.
 * Gồm cả 4 tín hiệu: view · like · comment · share.
 *  - CÓ views (video/watch): chấm theo TỈ LỆ tương tác / view (hấp dẫn = engagement cao so với reach).
 *  - KHÔNG views (reel FB không hiện view): chấm theo ĐỘ LỚN tuyệt đối like/comment/share.
 * Trả score=null nếu không có tín hiệu nào.
 *
 * @param {object} engStats - { views, likes, comments, shares }
 * @returns {{ score: number|null, label: string, color: string }}
 */
export function calcQuickScore(engStats) {
  const { views, likes, comments, shares } = engStats || {};

  if (likes == null && comments == null && shares == null) {
    return { score: null, label: getScoreLabel(null), color: getScoreColor(null) };
  }

  // Có views → tái dùng công thức rate-based đầy đủ (view/like/comment/share), bỏ sentiment.
  if (views != null && views > 0) {
    const r = calcPipScore({ views, likes, comments, shares }, []);
    const s = r.score == null ? null : r.score;
    return { score: s, label: getScoreLabel(s), color: getScoreColor(s) };
  }

  // Không views (reel) → blend ĐỘ PHỦ (volume) + CHẤT LƯỢNG (tỉ lệ hành vi).
  const tier = (n, tiers) => {
    if (n == null) return 0;
    for (const [th, pts] of tiers) if (n >= th) return pts;
    return 0;
  };

  const sh = shares || 0, cm = comments || 0, lk = likes || 0;

  // 1) VOLUME (0–6) — độ phủ, trọng số theo sức nặng hành vi: share≫comment>like.
  //    1 share ≈ 5 like, 1 comment ≈ 2 like (share tốn công + lan truyền mạnh nhất).
  const weightedVolume = sh * 5 + cm * 2 + lk * 0.3;
  const volumePts = tier(weightedVolume, [[50000, 6], [15000, 5], [4000, 4], [1000, 3], [300, 2], [50, 1]]);

  // 2) QUALITY (0–4) — hành vi hiện đại: nội dung khiến người ta CHỦ ĐỘNG (share/comment)
  //    chứ không chỉ like cho có. Tỉ lệ (share*2 + comment) / like.
  const qualityRatio = lk > 0 ? (sh * 2 + cm) / lk : (sh + cm > 0 ? 1 : 0);
  const qualityPts = tier(qualityRatio, [[0.05, 4], [0.02, 3], [0.01, 2], [0.004, 1]]);

  const score = Math.round(Math.min(10, volumePts + qualityPts) * 10) / 10;
  return { score, label: getScoreLabel(score), color: getScoreColor(score) };
}

/** Map điểm quick-score → key nhãn i18n (dùng chung cho chip + badge PiP). */
export function quickScoreLabelKey(score) {
  if (score == null) return 'score_na';
  if (score >= 8) return 'score_viral';
  if (score >= 6) return 'score_good';
  if (score >= 4) return 'score_avg';
  if (score >= 2) return 'score_weak';
  return 'score_vweak';
}

/**
 * Trả về nhãn mô tả điểm số.
 * @param {number|null} score
 */
export function getScoreLabel(score) {
  if (score === null) return 'N/A';
  if (score >= 8) return 'Viral';
  if (score >= 6) return 'Tốt';
  if (score >= 4) return 'Trung bình';
  if (score >= 2) return 'Yếu';
  return 'Rất yếu';
}

/**
 * Trả về màu accent theo điểm số (CSS color string).
 */
export function getScoreColor(score) {
  if (score === null) return '#888';
  if (score >= 8) return '#22c55e'; // xanh lá — viral
  if (score >= 6) return '#a78bfa'; // tím accent — tốt
  if (score >= 4) return '#facc15'; // vàng — trung bình
  if (score >= 2) return '#f97316'; // cam — yếu
  return '#ef4444'; // đỏ — rất yếu
}
