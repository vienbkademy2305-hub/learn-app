/**
 * Shape of the English snapshot `.data/content/en.json` (importers/en/export.ts).
 * Item types mirror the YAML schema in importers/en/load.ts.
 */
import type { EnTest as Test, Exercise, GrammarPoint, LexEntry, Lesson, Sentence, Sound, Step } from "../../importers/en/load";

export type { Exercise, Step };
export type EnWord = LexEntry & { slug: string; /** first lesson whose vocabulary lists it */ lesson: number | null };
export type EnSentence = Sentence;
export type EnGrammar = GrammarPoint;
export type EnLesson = Lesson;
export type EnSound = Sound;
export type EnTest = Test;

export interface EnContentSnapshot {
  generatedAt: string;
  lessons: EnLesson[];
  tests: EnTest[];
  words: Record<string, EnWord>;
  sentences: Record<string, EnSentence>;
  grammar: Record<string, EnGrammar>;
  sounds: Record<string, EnSound>;
  sources: Array<{ id: string; name: string; license: string; url: string | null }>;
}

/** The lesson steps shown as tabs, in order (data-schema.md §5). */
export const EN_STEPS = [
  { type: "vocabulary", label: "Từ vựng", path: "" },
  { type: "pronunciation", label: "Phát âm", path: "/pronunciation" },
  { type: "grammar", label: "Ngữ pháp", path: "/grammar" },
  { type: "examples", label: "Câu ví dụ", path: "/examples" },
  { type: "dialogue", label: "Hội thoại", path: "/dialogue" },
  { type: "exercises", label: "Bài tập", path: "/exercises" },
  { type: "homework", label: "Về nhà", path: "/homework" },
] as const;
export type EnStepType = (typeof EN_STEPS)[number]["type"];
