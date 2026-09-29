/**
 * Scoring of English stage tests (data/en/tests/): every graded item is tagged with the lesson that
 * teaches it, so a result can say which lessons to review.
 */
import type { EnTest, Exercise } from "@/content/en-types";

/** Points a dictation is worth in a test (share of words written correctly). Kept in sync with ExerciseSet. */
export const DICTATION_POINTS = 5;

/** Lesson of each graded item of an exercise, in the order the grader returns them. */
export function itemLessons(ex: Exercise): number[] {
  const fallback = ex.lesson ?? 0;
  if (ex.kind === "dictation") return Array.from({ length: DICTATION_POINTS }, () => fallback);
  if (ex.kind === "match-definition" || ex.kind === "collocation") return (ex.pairs ?? []).map(() => fallback);
  if (ex.kind === "error-correction") return (ex.errors ?? []).map(() => fallback);
  return (ex.questions ?? []).map((q) => q.lesson ?? fallback);
}

export const testExercises = (t: EnTest): Exercise[] => t.sections.flatMap((s) => s.exercises);
export const testItemCount = (t: EnTest) => testExercises(t).reduce((n, ex) => n + itemLessons(ex).length, 0);

export interface TestSummary {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  byLesson: Record<string, [number, number]>;
  bySection: Array<{ title_vi: string; correct: number; total: number }>;
}

/** results: exercise id → one boolean per graded item (missing exercise = all wrong). */
export function summarizeTest(t: EnTest, results: Record<string, boolean[]>): TestSummary {
  const byLesson: Record<string, [number, number]> = {};
  const bySection = t.sections.map((sec) => {
    let correct = 0;
    let total = 0;
    for (const ex of sec.exercises) {
      const lessons = itemLessons(ex);
      const ok = results[ex.id] ?? [];
      lessons.forEach((lesson, i) => {
        const hit = ok[i] === true;
        const cell = (byLesson[String(lesson)] ??= [0, 0]);
        cell[0] += hit ? 1 : 0;
        cell[1] += 1;
        correct += hit ? 1 : 0;
        total += 1;
      });
    }
    return { title_vi: sec.title_vi, correct, total };
  });
  const correct = bySection.reduce((n, s) => n + s.correct, 0);
  const total = bySection.reduce((n, s) => n + s.total, 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= t.pass_percent, byLesson, bySection };
}

/** Lessons answered below the pass mark, weakest first. */
export function weakLessons(byLesson: Record<string, [number, number]>, passPercent: number): Array<{ lesson: number; correct: number; total: number }> {
  return Object.entries(byLesson)
    .map(([lesson, [correct, total]]) => ({ lesson: Number(lesson), correct, total }))
    .filter((l) => l.total > 0 && (l.correct / l.total) * 100 < passPercent)
    .sort((a, b) => a.correct / a.total - b.correct / b.total || a.lesson - b.lesson);
}
