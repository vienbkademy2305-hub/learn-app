"use client";
/**
 * English progress, kept apart from the Chinese store (ENGLISH_SPLIT_PLAN §3).
 * Two scopes like the Chinese store: the browser's guest progress (`chinese-app:en:progress:v1`)
 * and, once signed in, the account's copy cached per user (`…:user:<uid>`) and mirrored to the
 * Supabase table `progress_en` by ./sync.ts (supabase/en-progress.sql). Without that table the
 * account copy simply stays in this browser.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { Cached } from "@/domain/en-sync";
import { BOX_INTERVAL_DAYS, MAX_BOX } from "@/domain/progress";
import type { Mastery } from "@/domain/word-game";

export interface EnProgress {
  /** lesson slug → step types opened */
  steps: Record<string, string[]>;
  /** exercise id → best result */
  exercises: Record<string, { correct: number; total: number; at: string }>;
  /** lesson slug → homework draft */
  homework: Record<string, { text: string; done: boolean; at: string }>;
  /** lexicon id → flashcard Leitner box (same schedule as the Chinese notebook) */
  cards: Record<string, { box: number; due: string; reviews: number }>;
  /** test id → every attempt (newest last) */
  tests: Record<string, TestAttempt[]>;
  /** lexicon id → word-game level (src/domain/word-game.ts) */
  mastery: Record<string, Mastery>;
  /** days with word-game answers (YYYY-MM-DD) */
  gameDays: string[];
}

export interface TestAttempt {
  at: string;
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  seconds: number;
  /** lesson number → [correct, total] for this attempt */
  byLesson: Record<string, [number, number]>;
}

const GUEST_KEY = "chinese-app:en:progress:v1";
const userKey = (uid: string) => `${GUEST_KEY}:user:${uid}`;
export const EMPTY_EN: EnProgress = { steps: {}, exercises: {}, homework: {}, cards: {}, tests: {}, mastery: {}, gameDays: [] };
const listeners = new Set<() => void>();
let scope: string | null = null;
let current: EnProgress | null = null;
let changeHook: ((state: EnProgress, updatedAt: string) => void) | null = null;

export function parseEnProgress(raw: unknown): EnProgress {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<EnProgress>;
  return { steps: r.steps ?? {}, exercises: r.exercises ?? {}, homework: r.homework ?? {}, cards: r.cards ?? {}, tests: r.tests ?? {}, mastery: r.mastery ?? {}, gameDays: Array.isArray(r.gameDays) ? r.gameDays : [] };
}
export const isEmptyEn = (p: EnProgress) =>
  !Object.keys(p.steps).length && !Object.keys(p.exercises).length && !Object.keys(p.homework).length && !Object.keys(p.cards).length && !Object.keys(p.tests).length && !Object.keys(p.mastery).length;

export const saveTestAttempt = (id: string, attempt: TestAttempt) => (p: EnProgress): EnProgress => ({
  ...p,
  tests: { ...p.tests, [id]: [...(p.tests[id] ?? []), attempt].slice(-20) },
});

/** Best attempt of a test (highest percent), if any. */
export const bestAttempt = (p: EnProgress, id: string): TestAttempt | undefined =>
  (p.tests[id] ?? []).reduce<TestAttempt | undefined>((best, a) => (!best || a.percent > best.percent ? a : best), undefined);

function load(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: keep progress in memory for this tab
  }
}

export const readEnGuest = (): EnProgress => parseEnProgress(load(GUEST_KEY));
export function readEnUserCache(uid: string): Cached<EnProgress> | null {
  const raw = load(userKey(uid)) as Partial<Cached<EnProgress>> | null;
  if (!raw || typeof raw.updatedAt !== "string") return null;
  return { state: parseEnProgress(raw.state), updatedAt: raw.updatedAt, syncedAt: typeof raw.syncedAt === "string" ? raw.syncedAt : null };
}
export const writeEnUserCache = (uid: string, cache: Cached<EnProgress>) => save(userKey(uid), cache);

function read(): EnProgress {
  if (current) return current;
  current = scope ? (readEnUserCache(scope)?.state ?? EMPTY_EN) : readEnGuest();
  return current;
}

function notify() {
  for (const l of listeners) l();
}

function write(next: EnProgress) {
  current = next;
  if (scope) {
    const updatedAt = new Date().toISOString();
    save(userKey(scope), { state: next, updatedAt, syncedAt: readEnUserCache(scope)?.syncedAt ?? null } satisfies Cached<EnProgress>);
    changeHook?.(next, updatedAt);
  } else save(GUEST_KEY, next);
  notify();
}

/** Switches between guest (null) and an account; `state` replaces what the pages show. */
export function setEnScope(uid: string | null, state?: EnProgress) {
  scope = uid;
  current = state ?? null;
  notify();
}

/** Registers the account sync: called after every local change while signed in. */
export function onEnLocalChange(hook: typeof changeHook) {
  changeHook = hook;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== (scope ? userKey(scope) : GUEST_KEY)) return;
    current = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useEnProgress(): [EnProgress, (fn: (p: EnProgress) => EnProgress) => void, boolean] {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_EN);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((fn: (p: EnProgress) => EnProgress) => {
    const next = fn(read());
    if (next !== read()) write(next);
  }, []);
  return [state, update, hydrated];
}

export const markStep = (slug: string, step: string) => (p: EnProgress): EnProgress =>
  p.steps[slug]?.includes(step) ? p : { ...p, steps: { ...p.steps, [slug]: [...(p.steps[slug] ?? []), step] } };

/** Keeps the best score; a later attempt with the same score refreshes the date. */
export const saveScore = (id: string, correct: number, total: number) => (p: EnProgress): EnProgress => {
  const prev = p.exercises[id];
  if (prev && prev.correct > correct) return p;
  return { ...p, exercises: { ...p.exercises, [id]: { correct, total, at: new Date().toISOString() } } };
};

export const saveHomework = (slug: string, text: string, done: boolean) => (p: EnProgress): EnProgress => ({
  ...p,
  homework: { ...p.homework, [slug]: { text, done, at: new Date().toISOString() } },
});

/** Flashcard answer: remembered → next box, forgot → box 1 (due now). */
export const reviewEnCard = (id: string, remembered: boolean, now = new Date()) => (p: EnProgress): EnProgress => {
  const prev = p.cards[id];
  const box = remembered ? Math.min((prev?.box ?? 1) + 1, MAX_BOX) : 1;
  const due = new Date(now.getTime() + BOX_INTERVAL_DAYS[box]! * 86_400_000).toISOString();
  return { ...p, cards: { ...p.cards, [id]: { box, due, reviews: (prev?.reviews ?? 0) + 1 } } };
};

/** Never-reviewed cards count as due. */
export const isEnCardDue = (p: EnProgress, id: string, now = new Date()) => !p.cards[id] || p.cards[id].due <= now.toISOString();
