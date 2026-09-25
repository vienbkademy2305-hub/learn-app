"use client";
/**
 * Browser-local ProgressStore (PHASE2_PLAN §5). Swappable for a server store
 * once auth exists. localStorage may be unavailable (private mode, blocked
 * storage) — the app then keeps progress in memory for the session.
 */
import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_PROGRESS, parseProgress, type ProgressState } from "@/domain/progress";

const KEY = "chinese-app:progress:v1";
const listeners = new Set<() => void>();
let current: ProgressState | null = null;

function read(): ProgressState {
  if (current) return current;
  try {
    current = parseProgress(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = EMPTY_PROGRESS;
  }
  return current;
}

function write(next: ProgressState) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: progress stays in memory for this tab.
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
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
