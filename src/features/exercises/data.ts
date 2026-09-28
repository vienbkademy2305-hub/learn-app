/** Server-side: lesson content trimmed to what the exercise generators need. */
import { getLesson, getSentence, getWord } from "@/content/load";
import type { ExSentence, ExWord } from "@/domain/exercises";

export function lessonExerciseData(slug: string): { words: ExWord[]; sentences: ExSentence[] } {
  const lesson = getLesson(slug);
  if (!lesson) return { words: [], sentences: [] };
  const words: ExWord[] = lesson.words
    .map(getWord)
    .filter((w) => w !== undefined)
    .map((w) => ({
      slug: w.slug,
      simplified: w.simplified,
      pinyin: w.pinyin,
      meaning: w.meanings[0] ?? null,
      chars: w.chars.map((c) => ({ hanzi: c.hanzi, pinyin: c.pinyin, stroke: c.stroke })),
    }));
  const sentences: ExSentence[] = lesson.sentences
    .map(getSentence)
    .filter((s) => s !== undefined)
    .map((s) => ({ key: s.key, simplified: s.simplified, pinyin: s.pinyin, vi: s.vi?.text ?? null, audio: s.audio, audioMs: s.audioMs, tokens: s.tokens }));
  return { words, sentences };
}

export const EXERCISE_TYPES = [
  {
    type: "listening",
    path: "listening",
    title: "Bài nghe",
    icon: "🎧",
    description: "Nghe câu rồi chọn nghĩa đúng, chọn câu đúng, hoặc chọn từ còn thiếu.",
  },
  {
    type: "sentences",
    path: "sentences",
    title: "Bài viết",
    icon: "📝",
    description: "Sắp xếp từ thành câu và viết pinyin cho từ.",
  },
  {
    type: "characters",
    path: "characters",
    title: "Viết chữ",
    icon: "✍️",
    description: "Tự viết chữ Hán không có nét mờ — máy chấm từng nét.",
  },
] as const;
