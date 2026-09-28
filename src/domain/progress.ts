/**
 * Learner progress (PHASE2_PLAN §5). Pure state transitions; persistence lives
 * in src/features/progress/store.ts. Keys are stable across re-imports:
 * words by slug, lessons by slug.
 */

export type ExerciseType = "listening" | "sentences" | "characters";

export interface ExerciseResult {
  best: number;
  last: number;
  total: number;
  at: string;
}

export interface ProgressState {
  v: 1;
  /** word slug → ISO time it was marked learned */
  learned: Record<string, string>;
  lessons: Record<string, { startedAt?: string; completedAt?: string }>;
  /** "<lesson slug>:<exercise type>" → scores (PHASE3_EXERCISES_PLAN §3) */
  exercises?: Record<string, ExerciseResult>;
  /** word slug → ISO time it was saved to the word notebook (PHASE4_PRACTICE_PLAN §3) */
  saved?: Record<string, string>;
  /** word slug → flashcard review state (Leitner boxes) */
  cards?: Record<string, CardState>;
  /** "<lesson slug>:sentence:<word slug>" | "<lesson slug>:paragraph" → learner's own writing */
  notes?: Record<string, Note>;
}

export interface CardState {
  /** 1 (new / forgotten) … 5 (well known) */
  box: number;
  /** ISO time the card is due again */
  due: string;
  reviews: number;
}

export interface Note {
  text: string;
  at: string;
}

export const exerciseKey = (lessonSlug: string, type: ExerciseType) => `${lessonSlug}:${type}`;

export function recordExercise(state: ProgressState, lessonSlug: string, type: ExerciseType, score: number, total: number, now = new Date()): ProgressState {
  const key = exerciseKey(lessonSlug, type);
  const prev = state.exercises?.[key];
  // Compare as ratios: the number of questions can change between runs.
  const best = prev && prev.best / prev.total >= score / total ? prev : { best: score, total };
  return {
    ...markLessonStarted(state, lessonSlug, now),
    exercises: { ...state.exercises, [key]: { best: best.best, total: best.total, last: score, at: now.toISOString() } },
  };
}

export function toggleSaved(state: ProgressState, wordSlug: string, saved: boolean, now = new Date()): ProgressState {
  const next = { ...state.saved };
  if (saved) next[wordSlug] ??= now.toISOString();
  else delete next[wordSlug];
  return { ...state, saved: next };
}

/** Days until the next review for each Leitner box (index = box). */
export const BOX_INTERVAL_DAYS = [0, 0, 1, 3, 7, 16] as const;
export const MAX_BOX = 5;

/** Flashcard answer: "remembered" moves the card up one box, "forgot" back to box 1 (due now). */
export function reviewCard(state: ProgressState, wordSlug: string, remembered: boolean, now = new Date()): ProgressState {
  const prev = state.cards?.[wordSlug];
  const box = remembered ? Math.min((prev?.box ?? 1) + 1, MAX_BOX) : 1;
  const due = new Date(now.getTime() + BOX_INTERVAL_DAYS[box]! * 86_400_000).toISOString();
  return { ...state, cards: { ...state.cards, [wordSlug]: { box, due, reviews: (prev?.reviews ?? 0) + 1 } } };
}

/** Never-reviewed cards count as due. */
export function isDue(state: ProgressState, wordSlug: string, now = new Date()): boolean {
  const card = state.cards?.[wordSlug];
  return !card || card.due <= now.toISOString();
}

export const noteKey = {
  sentence: (lessonSlug: string, wordSlug: string) => `${lessonSlug}:sentence:${wordSlug}`,
  paragraph: (lessonSlug: string) => `${lessonSlug}:paragraph`,
};

/** Saves (or, for blank text, deletes) a piece of the learner's writing. */
export function saveNote(state: ProgressState, key: string, text: string, now = new Date()): ProgressState {
  const next = { ...state.notes };
  if (text.trim()) next[key] = { text, at: now.toISOString() };
  else delete next[key];
  return { ...state, notes: next };
}

export type LessonStatus ="not_started" | "in_progress" | "completed";

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
  const obj = <T extends object>(v: T | undefined): T => (v && typeof v === "object" ? { ...v } : ({} as T));
  return { v: 1, learned: { ...r.learned }, lessons: { ...r.lessons }, exercises: obj(r.exercises), saved: obj(r.saved), cards: obj(r.cards), notes: obj(r.notes) };
}
