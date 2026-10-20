/**
 * Detective stories (docs/DETECTIVE_STORIES_PLAN.md): data model, validation and scoring. Pure.
 * A story has N witnesses (2–5); each interview is worth up to 3 stars, plus 1 star for naming the culprit at the
 * first attempt, so a story is worth 3 × N + 1 stars.
 */
import { starsFor } from "./quiz";

export type StoryLevel = "A2" | "B1" | "B2";

export interface StorySegment {
  text_en: string;
  vi: string;
  /** ids of the clues this statement gives */
  clues?: string[];
  /** words/phrases worth noticing */
  focus?: string[];
}
export interface StoryCheck {
  claim_vi: string;
  answer: boolean;
  explain_vi: string;
}
export interface StoryWitness {
  id: string;
  name: string;
  role_en: string;
  avatar: string;
  segments: StorySegment[];
  checks: StoryCheck[];
}
export interface StoryClue {
  id: string;
  witness: string;
  text_en: string;
  text_vi: string;
}
export interface Story {
  id: string;
  level: StoryLevel;
  lesson_range: [number, number];
  status: string;
  title_vi: string;
  cover: string;
  premise_vi: string;
  clues: StoryClue[];
  witnesses: StoryWitness[];
  solution: { culprit: string; evidence: string[]; explain_vi: string; confession_en: string; confession_vi: string };
}

export const MIN_WITNESSES = 2;
export const MAX_WITNESSES = 5;
export const EVIDENCE_COUNT = 2;
export const XP_WITNESS = 10;
export const XP_SOLVED = 20;

export const maxStars = (s: Story) => 3 * s.witnesses.length + 1;

/** Problems that would make a story unplayable or unfair; empty when the story is fine. */
export function validateStory(s: Story): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(`${s.id}: ${m}`);
  const wids = s.witnesses.map((w) => w.id);
  const cids = s.clues.map((c) => c.id);
  if (new Set(wids).size !== wids.length) err("duplicate witness id");
  if (new Set(cids).size !== cids.length) err("duplicate clue id");
  if (s.witnesses.length < MIN_WITNESSES || s.witnesses.length > MAX_WITNESSES) err(`needs ${MIN_WITNESSES}–${MAX_WITNESSES} witnesses`);
  if (!wids.includes(s.solution.culprit)) err("culprit is not a witness");
  if (s.solution.evidence.length !== EVIDENCE_COUNT) err(`evidence must have ${EVIDENCE_COUNT} clues`);
  for (const e of s.solution.evidence) if (!cids.includes(e)) err(`evidence clue "${e}" does not exist`);
  for (const c of s.clues) if (!wids.includes(c.witness)) err(`clue "${c.id}" points at unknown witness "${c.witness}"`);
  const given = new Map<string, string>();
  for (const w of s.witnesses) {
    if (w.segments.length < 2) err(`${w.id}: needs at least 2 statements`);
    if (w.checks.length < 2) err(`${w.id}: needs at least 2 true/false checks`);
    for (const seg of w.segments) {
      if (!seg.text_en.trim() || !seg.vi.trim()) err(`${w.id}: empty statement`);
      for (const c of seg.clues ?? []) {
        if (!cids.includes(c)) err(`${w.id}: statement gives unknown clue "${c}"`);
        given.set(c, w.id);
      }
    }
  }
  // every clue must be heard in some statement, from the witness that owns it, and the evidence must be findable
  for (const c of s.clues) {
    if (!given.has(c.id)) err(`clue "${c.id}" is never given in a statement`);
    else if (given.get(c.id) !== c.witness) err(`clue "${c.id}" is given by "${given.get(c.id)}" but owned by "${c.witness}"`);
  }
  // the checks need both answers, otherwise "always true" wins
  const all = s.witnesses.flatMap((w) => w.checks.map((c) => c.answer));
  if (!all.includes(true) || !all.includes(false)) err("checks must contain both true and false answers");
  return errs;
}

/** Number of stars for one interview. */
export const interviewStars = (correct: number, total: number) => starsFor(correct, total);

/* ---------- progress ---------- */

export type Suspicion = "suspect" | "innocent";

export interface WitnessProgress {
  stars: number;
  correct: number;
  total: number;
  seconds: number;
  /** reading speed over the statements (words per minute), when it could be measured */
  wpm?: number;
  suspicion?: Suspicion;
}
export interface StoryProgress {
  witnesses: Record<string, WitnessProgress>;
  /** attempts at naming the culprit; `solved` once it was right */
  accusations: number;
  solved: boolean;
  /** the star for solving needs the first attempt to be right */
  solvedFirstTry: boolean;
}
export interface StoriesState {
  v: 1;
  stories: Record<string, StoryProgress>;
}

export const EMPTY_STORIES: StoriesState = Object.freeze({ v: 1, stories: {} }) as StoriesState;
export const emptyProgress = (): StoryProgress => ({ witnesses: {}, accusations: 0, solved: false, solvedFirstTry: false });

export function starsEarned(p: StoryProgress | undefined): number {
  if (!p) return 0;
  return Object.values(p.witnesses).reduce((n, w) => n + w.stars, 0) + (p.solvedFirstTry ? 1 : 0);
}

/** Witnesses that have been interviewed at least once. */
export const interviewed = (p: StoryProgress | undefined) => Object.keys(p?.witnesses ?? {});

/** Records an interview result, keeping the best stars/score of repeated attempts. XP is returned only for improvements. */
export function recordInterview(state: StoriesState, storyId: string, witnessId: string, result: { correct: number; total: number; seconds: number; wpm?: number }): { state: StoriesState; xp: number } {
  const p = state.stories[storyId] ?? emptyProgress();
  const prev = p.witnesses[witnessId];
  const stars = interviewStars(result.correct, result.total);
  const better = !prev || stars > prev.stars || (stars === prev.stars && result.correct > prev.correct);
  const next: WitnessProgress = better ? { ...result, stars, suspicion: prev?.suspicion } : prev!;
  const xp = !prev ? XP_WITNESS : stars > prev.stars ? Math.round(XP_WITNESS / 2) : 0;
  return { state: { ...state, stories: { ...state.stories, [storyId]: { ...p, witnesses: { ...p.witnesses, [witnessId]: next } } } }, xp };
}

export function setSuspicion(state: StoriesState, storyId: string, witnessId: string, suspicion: Suspicion): StoriesState {
  const p = state.stories[storyId] ?? emptyProgress();
  const w = p.witnesses[witnessId];
  if (!w) return state;
  return { ...state, stories: { ...state.stories, [storyId]: { ...p, witnesses: { ...p.witnesses, [witnessId]: { ...w, suspicion } } } } };
}

export interface Accusation {
  culprit: string;
  evidence: string[];
}

/** Is the accusation right: the culprit and both pieces of evidence? */
export function judge(story: Story, a: Accusation): { culpritOk: boolean; evidenceOk: boolean; ok: boolean } {
  const culpritOk = a.culprit === story.solution.culprit;
  const want = [...story.solution.evidence].sort().join("|");
  const evidenceOk = [...a.evidence].sort().join("|") === want;
  return { culpritOk, evidenceOk, ok: culpritOk && evidenceOk };
}

export function recordAccusation(state: StoriesState, story: Story, a: Accusation): { state: StoriesState; ok: boolean; xp: number } {
  const p = state.stories[story.id] ?? emptyProgress();
  const { ok } = judge(story, a);
  const first = p.accusations === 0;
  const next: StoryProgress = { ...p, accusations: p.accusations + 1, solved: p.solved || ok, solvedFirstTry: p.solvedFirstTry || (ok && first) };
  return { state: { ...state, stories: { ...state.stories, [story.id]: next } }, ok, xp: ok && !p.solved ? XP_SOLVED : 0 };
}

export function parseStories(raw: unknown): StoriesState {
  if (!raw || typeof raw !== "object") return EMPTY_STORIES;
  const r = raw as Partial<StoriesState>;
  if (r.v !== 1 || !r.stories || typeof r.stories !== "object") return EMPTY_STORIES;
  return { v: 1, stories: { ...r.stories } };
}

/** Where to go next in a story: the first witness not interviewed yet, or the accusation. */
export function nextStep(story: Story, p: StoryProgress | undefined): { kind: "interview"; witness: string } | { kind: "accuse" } | { kind: "done" } {
  if (p?.solved) return { kind: "done" };
  const next = story.witnesses.find((w) => !p?.witnesses[w.id]);
  return next ? { kind: "interview", witness: next.id } : { kind: "accuse" };
}

/** Clues the learner has heard: those given by statements of interviewed witnesses. */
export function heardClues(story: Story, p: StoryProgress | undefined): StoryClue[] {
  const heard = new Set(interviewed(p));
  const ids = new Set(story.witnesses.filter((w) => heard.has(w.id)).flatMap((w) => w.segments.flatMap((s) => s.clues ?? [])));
  return story.clues.filter((c) => ids.has(c.id));
}

/** Words per minute of a reading phase; null when the time is too short/long to mean anything. */
export function readingWpm(text: string, seconds: number): number | null {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 5 || seconds < 3 || seconds > 600) return null;
  const wpm = Math.round((words / seconds) * 60);
  return wpm >= 20 && wpm <= 600 ? wpm : null;
}

/** Totals shown on the story page: average reading speed and reading-comprehension percent over the interviews so far. */
export function storyStats(p: StoryProgress | undefined): { wpm: number | null; comprehension: number | null } {
  const ws = Object.values(p?.witnesses ?? {});
  const wpms = ws.map((w) => w.wpm).filter((n): n is number => typeof n === "number");
  const total = ws.reduce((n, w) => n + w.total, 0);
  const correct = ws.reduce((n, w) => n + w.correct, 0);
  return {
    wpm: wpms.length ? Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : null,
    comprehension: total ? Math.round((correct / total) * 100) : null,
  };
}

/* ---------- merging copies (account sync) ---------- */

function bestWitness(a: WitnessProgress | undefined, b: WitnessProgress | undefined): WitnessProgress | undefined {
  if (!a || !b) return a ?? b;
  const [win, lose] = b.stars > a.stars || (b.stars === a.stars && b.correct > a.correct) ? [b, a] : [a, b];
  return { ...win, suspicion: win.suspicion ?? lose.suspicion, wpm: win.wpm ?? lose.wpm };
}

/** Combines two copies of the progress without losing anything: best result per interview, solved if either solved. */
export function mergeStories(a: StoriesState, b: StoriesState): StoriesState {
  const stories: Record<string, StoryProgress> = {};
  for (const id of new Set([...Object.keys(a.stories), ...Object.keys(b.stories)])) {
    const x = a.stories[id];
    const y = b.stories[id];
    if (!x || !y) {
      stories[id] = (x ?? y)!;
      continue;
    }
    const witnesses: Record<string, WitnessProgress> = {};
    for (const w of new Set([...Object.keys(x.witnesses), ...Object.keys(y.witnesses)])) witnesses[w] = bestWitness(x.witnesses[w], y.witnesses[w])!;
    stories[id] = { witnesses, accusations: Math.max(x.accusations, y.accusations), solved: x.solved || y.solved, solvedFirstTry: x.solvedFirstTry || y.solvedFirstTry };
  }
  return { v: 1, stories };
}

export const sameStories = (a: StoriesState, b: StoriesState) => JSON.stringify(a.stories) === JSON.stringify(b.stories);
export const isEmptyStories = (s: StoriesState) => Object.keys(s.stories).length === 0;
