/**
 * Learner progress (PHASE2_PLAN §5). Pure state transitions; persistence lives
 * in src/features/progress/store.ts. Keys are stable across re-imports:
 * words by slug, lessons by slug.
 */

export interface ProgressState {
  v: 1;
  /** word slug → ISO time it was marked learned */
  learned: Record<string, string>;
  lessons: Record<string, { startedAt?: string; completedAt?: string }>;
}

export type LessonStatus = "not_started" | "in_progress" | "completed";

export const EMPTY_PROGRESS: ProgressState = Object.freeze({ v: 1, learned: {}, lessons: {} }) as ProgressState;

export function setLearned(state: ProgressState, wordSlug: string, learned: boolean, now = new Date()): ProgressState {
  const next = { ...state.learned };
  if (learned) next[wordSlug] ??= now.toISOString();
  else delete next[wordSlug];
  return { ...state, learned: next };
}

export function markLessonStarted(state: ProgressState, lessonSlug: string, now = new Date()): ProgressState {
  if (state.lessons[lessonSlug]?.startedAt) return state;
  return { ...state, lessons: { ...state.lessons, [lessonSlug]: { ...state.lessons[lessonSlug], startedAt: now.toISOString() } } };
}

export function setLessonCompleted(state: ProgressState, lessonSlug: string, completed: boolean, now = new Date()): ProgressState {
  const current = state.lessons[lessonSlug] ?? {};
  const updated = completed
    ? { ...current, startedAt: current.startedAt ?? now.toISOString(), completedAt: now.toISOString() }
    : { startedAt: current.startedAt };
  return { ...state, lessons: { ...state.lessons, [lessonSlug]: updated } };
}

export function learnedCount(state: ProgressState, wordSlugs: string[]): number {
  return wordSlugs.filter((w) => state.learned[w]).length;
}

export function lessonPercent(state: ProgressState, wordSlugs: string[]): number {
  return wordSlugs.length === 0 ? 0 : Math.round((learnedCount(state, wordSlugs) / wordSlugs.length) * 100);
}

export function lessonStatus(state: ProgressState, lessonSlug: string, wordSlugs: string[]): LessonStatus {
  const lesson = state.lessons[lessonSlug];
  if (lesson?.completedAt) return "completed";
  if (lesson?.startedAt || learnedCount(state, wordSlugs) > 0) return "in_progress";
  return "not_started";
}

/** Accepts anything read from storage; returns a valid state or EMPTY_PROGRESS. */
export function parseProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== "object") return EMPTY_PROGRESS;
  const r = raw as Partial<ProgressState>;
  if (r.v !== 1 || typeof r.learned !== "object" || typeof r.lessons !== "object" || !r.learned || !r.lessons) return EMPTY_PROGRESS;
  return { v: 1, learned: { ...r.learned }, lessons: { ...r.lessons } };
}
