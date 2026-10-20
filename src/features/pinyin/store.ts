"use client";
/** Stars of the pinyin missions, kept in this browser (docs/UI_POLISH_PLAN.md). */
import { useSyncExternalStore } from "react";
import { EMPTY_PINYIN, parsePinyin, recordMission, type MissionId, type PinyinProgress } from "@/domain/pinyin-games";
import { earnXp } from "@/features/activity/store";
import { XP } from "@/domain/activity";

const KEY = "learn-app:pinyin:v1";
const listeners = new Set<() => void>();
let current: PinyinProgress | null = null;

function read(): PinyinProgress {
  if (current) return current;
  try {
    current = parsePinyin(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = EMPTY_PINYIN;
  }
  return current;
}

function write(next: PinyinProgress) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: stars live in memory for this tab
  }
  for (const l of listeners) l();
}

/** Saves the result of a mission; gives XP the first time and when the stars improve. */
export function finishMission(id: MissionId, stars: number) {
  const r = recordMission(read(), id, stars);
  if (r.state !== read()) write(r.state);
  if (r.improved) earnXp(XP.exercise);
}

export function usePinyinProgress(): [PinyinProgress, boolean] {
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      current = null;
      l();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_PINYIN);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return [state, hydrated];
}
