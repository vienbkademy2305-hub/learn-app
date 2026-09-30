/**
 * Word games for memorising vocabulary (docs/NANG_CAP_4_VIEC_PLAN.md, Việc 4). Pure logic shared by
 * English and Chinese: which game to ask, wrong options, the three levels a word must pass, the
 * in-session queue, and how a PASS moves the word's flashcard to Leitner box 3.
 *
 * Levels: 0 recognise (match / choose) → 1 listen (hear, choose) → 2 recall (type, or English
 * definition → word) → 3 passed. Each level needs two correct answers in a row.
 */
import { BOX_INTERVAL_DAYS, MAX_BOX, type CardState } from "./progress";
import { type Rng, shuffle } from "./exercises";

export interface GameWord {
  id: string;
  /** English headword / Chinese simplified */
  term: string;
  /** IPA / pinyin */
  reading: string | null;
  /** Vietnamese meaning shown in games */
  meaning: string;
  /** Simple English definition (Chinese: CC-CEDICT gloss); null when there is none yet */
  definitionEn: string | null;
  lesson: number;
  pos?: string;
}

export interface Mastery {
  /** 0 recognise · 1 listen · 2 recall · 3 passed */
  level: number;
  /** correct answers in a row at the current level */
  streak: number;
  /** wrong answers in total (≥ HARD_WRONG → "Từ khó") */
  wrong: number;
  passedAt?: string;
  at: string;
}

export interface GameProgress {
  mastery: Record<string, Mastery>;
  cards: Record<string, CardState>;
  /** ISO dates (YYYY-MM-DD) with at least one game answer, newest last */
  days: string[];
}

export const PASSED = 3;
export const STREAK_TO_ADVANCE = 2;
export const HARD_WRONG = 3;
/** Box a word jumps to when it is passed: next review 3 days later. */
export const PASS_BOX = 3;
/** A wrong word comes back after this many other questions. */
export const RETRY_GAP = 3;
export const NEW_PER_SESSION = 10;
export const MAX_QUESTIONS = 60;

export type Kind = "choose-term" | "choose-meaning" | "listen-choose" | "listen-type" | "type-term" | "definition";

export const LEVEL_NAMES = ["Nhận ra", "Nghe ra", "Nhớ lại", "Đã thuộc"] as const;

export const isPassed = (m: Mastery | undefined) => (m?.level ?? 0) >= PASSED;
export const isHard = (m: Mastery | undefined) => !!m && !isPassed(m) && m.wrong >= HARD_WRONG;

const day = (now: Date) => now.toISOString().slice(0, 10);

/** Game kinds that test a word at its level. `canListen` false (no voice) replaces listening by reading. */
export function kindsFor(level: number, lang: "en" | "zh", word: GameWord, canListen: boolean): Kind[] {
  if (level <= 0) return ["choose-term", "choose-meaning"];
  if (level === 1) return canListen ? ["listen-choose"] : ["choose-term"];
  // recall
  if (lang === "en") return [...(canListen ? (["listen-type"] as Kind[]) : []), "type-term", ...(word.definitionEn ? (["definition"] as Kind[]) : [])];
  return word.definitionEn ? ["definition"] : ["choose-term"];
}

/** Up to n wrong options: same lesson and part of speech first, never the same term or meaning. */
export function distractors(word: GameWord, pool: GameWord[], n: number, rng: Rng): GameWord[] {
  const ok = pool.filter((w) => w.id !== word.id && w.term !== word.term && w.meaning !== word.meaning);
  const score = (w: GameWord) => (w.lesson === word.lesson ? 2 : 0) + (word.pos && w.pos === word.pos ? 1 : 0) - Math.abs(w.lesson - word.lesson) / 100;
  const ranked = shuffle(ok, rng).sort((a, b) => score(b) - score(a));
  const out: GameWord[] = [];
  const seen = new Set<string>();
  for (const w of ranked) {
    if (seen.has(w.term) || seen.has(w.meaning)) continue;
    seen.add(w.term).add(w.meaning);
    out.push(w);
    if (out.length === n) break;
  }
  return out;
}

function moveCard(cards: Record<string, CardState>, id: string, box: number, now: Date, countReview = true): Record<string, CardState> {
  const b = Math.max(1, Math.min(box, MAX_BOX));
  const due = new Date(now.getTime() + BOX_INTERVAL_DAYS[b]! * 86_400_000).toISOString();
  return { ...cards, [id]: { box: b, due, reviews: (cards[id]?.reviews ?? 0) + (countReview ? 1 : 0) } };
}

function markDay(days: string[], now: Date): string[] {
  const d = day(now);
  return days[days.length - 1] === d ? days : [...days.filter((x) => x !== d), d].slice(-400);
}

/**
 * Records one answer. Learning: two in a row moves the word up a level; reaching PASSED puts its
 * flashcard in box 3. Review of a passed word: right → one box up, wrong → box 1 and back to recall.
 */
export function applyAnswer(gp: GameProgress, id: string, correct: boolean, now = new Date()): GameProgress {
  const prev: Mastery = gp.mastery[id] ?? { level: 0, streak: 0, wrong: 0, at: now.toISOString() };
  const at = now.toISOString();
  const days = markDay(gp.days, now);
  if (isPassed(prev)) {
    if (correct) {
      const box = Math.min((gp.cards[id]?.box ?? PASS_BOX) + 1, MAX_BOX);
      return { mastery: { ...gp.mastery, [id]: { ...prev, at } }, cards: moveCard(gp.cards, id, box, now), days };
    }
    const m: Mastery = { level: PASSED - 1, streak: 0, wrong: prev.wrong + 1, at };
    return { mastery: { ...gp.mastery, [id]: m }, cards: moveCard(gp.cards, id, 1, now), days };
  }
  if (!correct) return { ...gp, mastery: { ...gp.mastery, [id]: { ...prev, streak: 0, wrong: prev.wrong + 1, at } }, days };
  const streak = prev.streak + 1;
  if (streak < STREAK_TO_ADVANCE) return { ...gp, mastery: { ...gp.mastery, [id]: { ...prev, streak, at } }, days };
  const level = prev.level + 1;
  if (level < PASSED) return { ...gp, mastery: { ...gp.mastery, [id]: { ...prev, level, streak: 0, at } }, days };
  return { mastery: { ...gp.mastery, [id]: { ...prev, level: PASSED, streak: 0, passedAt: at, at } }, cards: moveCard(gp.cards, id, PASS_BOX, now), days };
}

/** A passed word whose flashcard is due: it gets one recall question in today's session. */
export const isReviewDue = (gp: GameProgress, id: string, now = new Date()) =>
  isPassed(gp.mastery[id]) && (!gp.cards[id] || gp.cards[id].due <= now.toISOString());

/** Today's plan: due reviews, words already started, then up to `newCount` new words. */
export function planSession(words: GameWord[], gp: GameProgress, opts: { newCount?: number; hardOnly?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  if (opts.hardOnly) return { review: [] as string[], learn: words.filter((w) => isHard(gp.mastery[w.id])).map((w) => w.id), fresh: 0 };
  const review = words.filter((w) => isReviewDue(gp, w.id, now)).map((w) => w.id);
  const started = words.filter((w) => gp.mastery[w.id] && !isPassed(gp.mastery[w.id])).map((w) => w.id);
  const fresh = words.filter((w) => !gp.mastery[w.id]).slice(0, opts.newCount ?? NEW_PER_SESSION).map((w) => w.id);
  return { review, learn: [...started, ...fresh], fresh: fresh.length };
}

/**
 * Next queue after answering the word at the head. Reviews leave after one answer unless wrong
 * (then they are re-learnt); learning words leave when passed. A right answer sends the word to the
 * back so every word gets turns; a wrong one brings it back after RETRY_GAP questions, unless it was
 * already wrong RETRY_GAP times this session (then it goes to the back and cannot block the others).
 */
export function nextQueue(queue: string[], after: GameProgress, wasReview: boolean, correct: boolean, wrongThisSession = 0): string[] {
  const [head, ...rest] = queue;
  if (head === undefined) return queue;
  if (wasReview && correct) return rest;
  if (isPassed(after.mastery[head])) return rest;
  if (correct || wrongThisSession >= RETRY_GAP) return [...rest, head];
  const gap = Math.min(RETRY_GAP, rest.length);
  return [...rest.slice(0, gap), head, ...rest.slice(gap)];
}

/** Days in a row (ending today or yesterday) with at least one answer. */
export function dayStreak(days: string[], now = new Date()): number {
  const set = new Set(days);
  const d = new Date(`${day(now)}T00:00:00Z`);
  if (!set.has(day(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(day(d))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export function summary(words: GameWord[], gp: GameProgress) {
  let passed = 0;
  let learning = 0;
  let hard = 0;
  for (const w of words) {
    const m = gp.mastery[w.id];
    if (isPassed(m)) passed++;
    else if (m) learning++;
    if (isHard(m)) hard++;
  }
  return { passed, learning, hard, fresh: words.length - passed - learning, total: words.length };
}
