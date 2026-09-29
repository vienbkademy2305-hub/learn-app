/**
 * Server-side access to the English snapshot (build time only). Generate it with `pnpm content:export:en`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { EN_STEPS, type EnContentSnapshot, type EnLesson, type EnSentence, type EnStepType, type EnWord, type Step } from "./en-types";

let cache: EnContentSnapshot | undefined;

export function enContent(): EnContentSnapshot {
  // in `next dev` re-read on every request so `pnpm content:export:en` shows up without a restart
  if (!cache || process.env.NODE_ENV === "development") {
    const file = path.join(process.cwd(), ".data", "content", "en.json");
    try {
      cache = JSON.parse(readFileSync(file, "utf8")) as EnContentSnapshot;
    } catch (err) {
      throw new Error(`English snapshot not found at ${file}. Run \`pnpm content:export:en\` first.`, { cause: err });
    }
  }
  return cache;
}

export const enLessons = (): EnLesson[] => enContent().lessons;
export const enLesson = (slug: string): EnLesson | undefined => enContent().lessons.find((l) => l.slug === slug);

export function enLessonNeighbors(slug: string): { prev: EnLesson | null; next: EnLesson | null } {
  const lessons = enLessons();
  const i = lessons.findIndex((l) => l.slug === slug);
  return { prev: lessons[i - 1] ?? null, next: lessons[i + 1] ?? null };
}

/** The step variant whose `type` union includes T (vocabulary/grammar/examples share one variant). */
type StepOf<T> = Step extends infer S ? (S extends { type: infer K } ? (T extends K ? S : never) : never) : never;

export function enStep<T extends Step["type"]>(lesson: EnLesson, type: T): StepOf<T> | undefined {
  return lesson.steps.find((s) => s.type === type) as StepOf<T> | undefined;
}

/** The step tabs this lesson actually has. */
export const enLessonSteps = (lesson: EnLesson) => EN_STEPS.filter((s) => lesson.steps.some((x) => x.type === s.type));

export function enStepNeighbors(lesson: EnLesson, type: EnStepType) {
  const steps = enLessonSteps(lesson);
  const i = steps.findIndex((s) => s.type === type);
  const href = (s: (typeof steps)[number]) => ({ href: `/en/lesson/${lesson.slug}${s.path}`, label: s.label });
  return { back: i > 0 ? href(steps[i - 1]!) : undefined, next: i >= 0 && i < steps.length - 1 ? href(steps[i + 1]!) : undefined };
}

export const enWord = (id: string): EnWord | undefined => enContent().words[id];
export const enWordBySlug = (slug: string): EnWord | undefined => Object.values(enContent().words).find((w) => w.slug === slug);
export const enSentence = (id: string): EnSentence | undefined => enContent().sentences[id];

/** Sentences that list the word, lesson sentences first. */
export function enSentencesFor(wordId: string): EnSentence[] {
  return Object.values(enContent().sentences).filter((s) => s.words?.includes(wordId));
}

export function enLessonWords(lesson: EnLesson): EnWord[] {
  return (enStep(lesson, "vocabulary")?.items ?? []).map((id) => enWord(id)).filter((w): w is EnWord => !!w);
}
