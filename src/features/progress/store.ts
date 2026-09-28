"use client";
/**
 * ProgressStore (PHASE2_PLAN §5, docs/ACCOUNTS_PLAN.md §3).
 *
 * Two scopes: the browser's guest progress (as before) and, once signed in, the
 * account's progress — cached per user in localStorage and mirrored to Supabase
 * by src/features/account/sync.ts through `onLocalChange`.
 * localStorage may be unavailable (private mode, blocked storage) — the app then
 * keeps progress in memory for the session.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { CachedProgress } from "@/domain/account";
import { EMPTY_PROGRESS, parseProgress, type ProgressState } from "@/domain/progress";

const GUEST_KEY = "chinese-app:progress:v1";
const userKey = (uid: string) => `chinese-app:progress:v1:user:${uid}`;

const listeners = new Set<() => void>();
let scope: string | null = null; // user id, or null for the guest
let current: ProgressState | null = null;
let changeHook: ((state: ProgressState, updatedAt: string) => void) | null = null;

const storageKey = () => (scope ? userKey(scope) : GUEST_KEY);

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
    // Storage unavailable: progress stays in memory for this tab.
  }
}

export function readGuestProgress(): ProgressState {
  return parseProgress(load(GUEST_KEY));
}

export function readUserCache(uid: string): CachedProgress | null {
  const raw = load(userKey(uid)) as Partial<CachedProgress> | null;
  if (!raw || typeof raw.updatedAt !== "string") return null;
  return { state: parseProgress(raw.state), updatedAt: raw.updatedAt, syncedAt: typeof raw.syncedAt === "string" ? raw.syncedAt : null };
}

export function writeUserCache(uid: string, cache: CachedProgress) {
  save(userKey(uid), cache);
}

function read(): ProgressState {
  if (current) return current;
  current = scope ? (readUserCache(scope)?.state ?? EMPTY_PROGRESS) : parseProgress(load(GUEST_KEY));
  return current;
}

function notify() {
  for (const l of listeners) l();
}

function write(next: ProgressState) {
  current = next;
  if (scope) {
    const prev = readUserCache(scope);
    const updatedAt = new Date().toISOString();
    save(userKey(scope), { state: next, updatedAt, syncedAt: prev?.syncedAt ?? null } satisfies CachedProgress);
    changeHook?.(next, updatedAt);
  } else {
    save(GUEST_KEY, next);
  }
  notify();
}

/** Switches between guest (null) and an account; `state` replaces what the pages show. */
export function setProgressScope(uid: string | null, state?: ProgressState) {
  scope = uid;
  current = state ?? null;
  notify();
}

/** Registers the account sync: called after every local change while signed in. */
export function onLocalChange(hook: typeof changeHook) {
  changeHook = hook;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== storageKey()) return;
    current = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Current progress plus an updater taking a pure transition from src/domain/progress.ts. */
export function useProgress(): [ProgressState, (update: (s: ProgressState) => ProgressState) => void, boolean] {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_PROGRESS);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((fn: (s: ProgressState) => ProgressState) => {
    const next = fn(read());
    if (next !== read()) write(next);
  }, []);
  return [state, update, hydrated];
}
