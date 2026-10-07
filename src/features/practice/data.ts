/** Server-side: lesson content trimmed for the practice step (docs/PHASE4_PRACTICE_PLAN.md). */
import { getLesson, getLessons, getSentence, getWord } from "@/content/load";
import type { WordData } from "@/content/types";
import { joinSinoViet } from "@/domain/display";
import type { GameWord } from "@/domain/word-game";

export const PRACTICE_TYPES = [
  { type: "vocab", path: "vocab", title: "Nhớ từ vựng", icon: "🧠", description: "Nhìn chữ chọn nghĩa, nhìn nghĩa hoặc pinyin chọn chữ." },
  { type: "flashcards", path: "flashcards", title: "Flashcard", icon: "🃏", description: "Lật thẻ để ôn từ, lưu từ khó vào Sổ từ. Máy nhắc ôn lại đúng lúc." },
  { type: "game", path: "game", title: "Học thuộc (game)", icon: "🎯", description: "Nối từ, chọn từ, nghe chọn, nghĩa tiếng Anh → chữ Hán. Qua 3 bậc là thuộc." },
  { type: "copy", path: "copy", title: "Tập chép chữ", icon: "🖌️", description: "Chép mỗi chữ 3 lượt: có nét mờ → mờ dần → tự viết." },
  { type: "sentences", path: "sentences", title: "Đặt câu", icon: "💬", description: "Tự đặt câu có nghĩa với từ của bài, so với câu mẫu." },
  { type: "speaking", path: "speaking", title: "Luyện nói", icon: "🎙️", description: "Ghi âm giọng bạn — máy chấm thanh điệu của từ và ngữ điệu của câu." },
  { type: "interpret", path: "noi-tu-tieng-viet", title: "Nói từ tiếng Việt", icon: "🗣️", description: "Nhìn câu tiếng Việt, tự nói bằng tiếng Trung. Có gợi ý pinyin → chữ Hán, máy nghe và chấm." },
  { type: "paragraph", path: "paragraph", title: "Viết đoạn văn", icon: "📄", description: "Viết một đoạn ngắn theo chủ đề bài, dùng từ vựng đã học." },
] as const;

export type PracticeType = (typeof PRACTICE_TYPES)[number]["type"];

/** What a flashcard shows about a word. */
export interface FlashWord {
  slug: string;
  simplified: string;
  pinyin: string;
  sinoViet: string | null;
  meanings: string[];
  example: { simplified: string; pinyin: string | null; vi: string | null; audio: { normal?: string; slow?: string }; audioMs?: { normal?: number; slow?: number } } | null;
}

export function toFlashWord(w: WordData, preferSentences?: ReadonlySet<string>): FlashWord {
  const key = (preferSentences && w.examples.find((k) => preferSentences.has(k))) ?? w.examples[0];
  const s = key ? getSentence(key) : undefined;
  return {
    slug: w.slug,
    simplified: w.simplified,
    pinyin: w.pinyin,
    sinoViet: joinSinoViet(w.chars),
    meanings: w.meanings.slice(0, 3),
    example: s ? { simplified: s.simplified, pinyin: s.pinyin, vi: s.vi?.text ?? null, audio: s.audio, audioMs: s.audioMs } : null,
  };
}

export function lessonFlashWords(slug: string): FlashWord[] {
  const lesson = getLesson(slug);
  if (!lesson) return [];
  const sentences = new Set(lesson.sentences);
  return lesson.words.map(getWord).filter((w) => w !== undefined).map((w) => toFlashWord(w, sentences));
}

/** Every curriculum word, for the notebook page (which words are saved is only known in the browser). */
export function allFlashWords(): Array<FlashWord & { lesson: { slug: string; number: number } | null }> {
  const seen = new Set<string>();
  const out: Array<FlashWord & { lesson: { slug: string; number: number } | null }> = [];
  for (const l of getLessons()) {
    for (const slug of l.words) {
      const w = getWord(slug);
      if (!w || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ ...toFlashWord(w), lesson: { slug: l.slug, number: l.number } });
    }
  }
  return out;
}

/** Han characters of every word taught up to and including this lesson. */
export function knownCharsUpTo(slug: string): string[] {
  const chars = new Set<string>();
  for (const l of getLessons()) {
    for (const w of l.words) for (const c of getWord(w)?.simplified ?? "") chars.add(c);
    if (l.slug === slug) break;
  }
  return [...chars];
}

/** Lesson sentences containing a word — models to compare the learner's own sentence with. */
export function modelSentences(slug: string, wordSlug: string, max = 3) {
  const lesson = getLesson(slug);
  const w = getWord(wordSlug);
  if (!lesson || !w) return [];
  const inLesson = new Set(lesson.sentences);
  const keys = [...w.examples.filter((k) => inLesson.has(k)), ...w.examples.filter((k) => !inLesson.has(k))];
  return keys
    .slice(0, max)
    .map(getSentence)
    .filter((s) => s !== undefined)
    .map((s) => ({ simplified: s.simplified, pinyin: s.pinyin, vi: s.vi?.text ?? null, audio: s.audio, audioMs: s.audioMs }));
}

/** Every curriculum word as a word-game item (docs/NANG_CAP_4_VIEC_PLAN.md, Việc 4), under the lesson that first teaches it. */
export function allGameWords(): GameWord[] {
  const seen = new Set<string>();
  const out: GameWord[] = [];
  for (const l of getLessons())
    for (const slug of l.words) {
      const w = getWord(slug);
      if (!w || seen.has(slug) || !w.meanings.length) continue;
      seen.add(slug);
      const en = w.meaningsEn.slice(0, 2).join("; ");
      out.push({ id: w.slug, term: w.simplified, reading: w.pinyin, meaning: w.meanings.slice(0, 2).join("; "), definitionEn: en || null, lesson: l.number });
    }
  return out;
}
