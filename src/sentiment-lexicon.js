/**
 * sentiment-lexicon.js — Từ điển cảm xúc tiếng Việt cho PiP Score.
 *
 * Cấu trúc: { từ: trọng_số }
 * Trọng số dương = tích cực, âm = tiêu cực, |x| = độ mạnh (0.5–2.0).
 * Mở rộng: chỉ cần thêm từ vào POSITIVE_WORDS / NEGATIVE_WORDS.
 */

export const POSITIVE_WORDS = {
  // Khen ngợi chung
  'hay': 1.0,
  'tuyệt': 1.5,
  'tuyệt vời': 2.0,
  'đỉnh': 1.5,
  'đỉnh của đỉnh': 2.0,
  'xuất sắc': 1.8,
  'siêu': 1.3,
  'xịn': 1.2,
  'xịn xò': 1.5,
  'ngon': 1.0,
  'đẹp': 1.0,
  'đẹp lắm': 1.5,
  'tốt': 0.8,
  'tốt lắm': 1.2,
  'thích': 1.0,
  'thích quá': 1.5,
  'yêu': 1.0,
  'yêu thích': 1.2,
  'love': 1.0,
  'amazing': 1.5,
  'awesome': 1.5,
  'great': 1.2,
  'good': 0.8,
  'nice': 0.8,
  'wow': 1.3,
  'OMG': 1.3,
  'omg': 1.3,

  // Giải trí / phim
  'hay phết': 1.3,
  'xem ngay': 1.5,
  'phải xem': 1.5,
  'nên xem': 1.2,
  'đáng xem': 1.3,
  'cày phim': 1.0,
  'nghiện': 1.2,
  'cuốn': 1.3,
  'cuốn quá': 1.5,
  'không thể bỏ qua': 1.8,

  // Cảm xúc tích cực
  'haha': 0.8,
  'hihi': 0.8,
  'hehe': 0.6,
  '😂': 1.0,
  '🤣': 1.0,
  '❤️': 1.2,
  '👍': 1.0,
  '🔥': 1.3,
  '💯': 1.5,
  '😍': 1.3,
  '🥰': 1.3,
  'cười': 0.7,
};

export const NEGATIVE_WORDS = {
  // Chê bai chung
  'dở': -1.0,
  'tệ': -1.2,
  'tệ lắm': -1.5,
  'chán': -1.0,
  'nhàm': -0.8,
  'nhàm chán': -1.2,
  'xấu': -0.8,
  'kém': -0.8,
  'thất vọng': -1.5,
  'không hay': -1.2,
  'không tốt': -1.0,
  'vô nghĩa': -1.3,
  'boring': -1.0,
  'bad': -1.0,
  'terrible': -1.5,
  'awful': -1.5,
  'waste': -1.2,

  // Cảm xúc tiêu cực
  'ghét': -1.3,
  'disgusting': -1.5,
  'không thích': -1.0,
  'chán quá': -1.3,
  '👎': -1.0,
  '😒': -0.8,
  '😤': -1.0,
  '🤮': -1.5,
  '😡': -1.3,

  // Nghi ngờ / cảnh báo
  'spam': -0.5,
  'lừa đảo': -2.0,
  'scam': -2.0,
  'fake': -1.0,
  'giả': -0.8,
};

/**
 * Tính điểm sentiment cho một đoạn text.
 * Trả về { score: number, matchedPositive: string[], matchedNegative: string[] }
 *
 * score > 0 = tích cực, < 0 = tiêu cực
 * Được nhân với trọng số like (nếu có) ở tầng pip-score.
 */
export function scoreSentiment(text) {
  if (!text || text.trim() === '') {
    return { score: 0, matchedPositive: [], matchedNegative: [] };
  }

  const lower = text.toLowerCase();
  let score = 0;
  const matchedPositive = [];
  const matchedNegative = [];

  // Kiểm tra từng từ trong từ điển (cụm từ dài trước, từ đơn sau)
  const positiveEntries = Object.entries(POSITIVE_WORDS).sort((a, b) => b[0].length - a[0].length);
  const negativeEntries = Object.entries(NEGATIVE_WORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [word, weight] of positiveEntries) {
    if (lower.includes(word.toLowerCase())) {
      score += weight;
      matchedPositive.push(word);
    }
  }

  for (const [word, weight] of negativeEntries) {
    if (lower.includes(word.toLowerCase())) {
      score += weight; // weight đã âm
      matchedNegative.push(word);
    }
  }

  return { score, matchedPositive, matchedNegative };
}
