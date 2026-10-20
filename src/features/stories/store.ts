"use client";
/**
 * Detective-story progress (docs/DETECTIVE_STORIES_PLAN.md). Kept in this browser (key below), like the daily activity.
 * XP goes to the shared streak through `earnXp`.
 */
import { useCallback, useSyncExternalStore } from "react";
import { earnXp } from "@/features/activity/store";
import {
  type Accusation,
  EMPTY_STORIES,
  parseStories,
  recordAccusation,
  recordInterview,
  setSuspicion,
  type StoriesState,
  type Story,
  type Suspicion,
} from "@/domain/story";

const KEY = "learn-app:stories:v1";
const listeners = new Set<() => void>();
let current: StoriesState | null = null;

function read(): StoriesState {
  if (current) return current;
  try {
    current = parseStories(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    current = EMPTY_STORIES;
  }
  return current;
}

const changeHooks = new Set<(state: StoriesState) => void>();

/** Called after every change made by the learner (not by a sync); used to push to the account. */
export function onStoriesChange(hook: (state: StoriesState) => void): () => void {
  changeHooks.add(hook);
  return () => changeHooks.delete(hook);
}

export const getStories = (): StoriesState => read();

/** Replaces the local copy with a synced one (no XP, no push). */
export function replaceStories(next: StoriesState) {
  write(next, false);
}

function write(next: StoriesState, local = true) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked: progress lives in memory for this tab
  }
  for (const l of listeners) l();
  if (local) for (const h of changeHooks) h(next);
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

export interface StoryActions {
  finishInterview(storyId: string, witnessId: string, result: { correct: number; total: number; seconds: number; wpm?: number }): void;
  mark(storyId: string, witnessId: string, suspicion: Suspicion): void;
  accuse(story: Story, a: Accusation): boolean;
}

export function useStories(): [StoriesState, StoryActions, boolean] {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY_STORIES);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const finishInterview = useCallback<StoryActions["finishInterview"]>((storyId, witnessId, result) => {
    const r = recordInterview(read(), storyId, witnessId, result);
    write(r.state);
    earnXp(r.xp);
  }, []);
  const mark = useCallback<StoryActions["mark"]>((storyId, witnessId, suspicion) => write(setSuspicion(read(), storyId, witnessId, suspicion)), []);
  const accuse = useCallback<StoryActions["accuse"]>((story, a) => {
    const r = recordAccusation(read(), story, a);
    write(r.state);
    earnXp(r.xp);
    return r.ok;
  }, []);
  return [state, { finishInterview, mark, accuse }, hydrated];
}
