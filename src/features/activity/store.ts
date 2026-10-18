"use client";
/**
 * Daily activity store (docs/ENGAGEMENT_AI_PLAN.md §1). Kept in this browser only (key below), shared by the
 * Chinese and English parts: one streak for "studying a language". The progress stores report their changes
 * through `earnXp`; pages read it with `useActivity`.
 */
import { useCallback, useSyncExternalStore } from "react";
import { addXp, EMPTY_ACTIVITY, GOALS, parseActivity, type ActivityState } from "@/domain/activity";

const KEY = "learn-app:activity:v1";
const listeners = new Set<() => void>();
let current: ActivityState | null = null;

function read(): ActivityState {
  if (current) return current;
  try {
    current = parseActivity(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = EMPTY_ACTIVITY;
  }
  return current;
}

function write(next: ActivityState) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the streak lives in memory for this tab
  }
  for (const l of listeners) l();
}

/** XP from a learning action; called by the progress stores and the AI chat. */
export function earnXp(xp: number) {
  if (typeof window === "undefined" || !(xp > 0)) return;
  write(addXp(read(), xp));
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

export function useActivity(): [ActivityState, { setGoal(xp: number): void; setReminder(time: string | undefined): void }, boolean] {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_ACTIVITY);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const setGoal = useCallback((xp: number) => {
    if (GOALS.some((g) => g.xp === xp)) write({ ...read(), goal: xp });
  }, []);
  const setReminder = useCallback((time: string | undefined) => write({ ...read(), reminder: time }), []);
  return [state, { setGoal, setReminder }, hydrated];
}
