"use client";
/**
 * Mirrors the story progress of the signed-in account to Supabase `public.progress_stories`
 * (supabase/stories-progress.sql). Unlike the other progress stores the two copies are MERGED (best result per
 * interview, solved if either solved) so nothing is ever lost. A browser that last belonged to another account does
 * not hand its progress to the new one. Without the table the progress simply stays in this browser.
 */
import { isMissingTable } from "@/domain/en-sync";
import { EMPTY_STORIES, isEmptyStories, mergeStories, parseStories, sameStories, type StoriesState } from "@/domain/story";
import { ACCOUNTS_ENABLED, onAccountChange, supabase } from "@/features/account/account";
import { getStories, onStoriesChange, replaceStories } from "./store";

const TABLE = "progress_stories";
const OWNER_KEY = "learn-app:stories:owner";
const PUSH_DELAY_MS = 1500;

let started = false;
let uid: string | null = null;
let disabled = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const owner = () => {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};
const setOwner = (id: string) => {
  try {
    window.localStorage.setItem(OWNER_KEY, id);
  } catch {
    // storage blocked
  }
};

async function push(user: string, state: StoriesState) {
  if (disabled) return;
  const { error } = await supabase().from(TABLE).upsert({ user_id: user, state, updated_at: new Date().toISOString() });
  if (error && isMissingTable(error)) disabled = true;
}

async function syncNow(user: string) {
  if (disabled) return;
  const { data, error } = await supabase().from(TABLE).select("state").eq("user_id", user).maybeSingle();
  if (uid !== user) return;
  if (error) {
    if (isMissingTable(error)) disabled = true;
    return;
  }
  const remote = data ? parseStories(data.state) : null;
  const previous = owner();
  // progress made as a guest (no owner yet) or by this same account is merged; another account's is not adopted
  const local = !previous || previous === user ? getStories() : null;
  const merged = remote && local ? mergeStories(local, remote) : (remote ?? local ?? EMPTY_STORIES);
  setOwner(user);
  if (!sameStories(merged, getStories())) replaceStories(merged);
  if (!isEmptyStories(merged) && (!remote || !sameStories(merged, remote))) await push(user, merged);
}

/** Started once from the story pages; safe to call again. */
export function startStoriesSync() {
  if (!ACCOUNTS_ENABLED || started) return;
  started = true;
  onAccountChange((next) => {
    if (next === uid) return;
    uid = next;
    if (next) void syncNow(next).catch(() => undefined);
  });
  onStoriesChange((state) => {
    if (!uid) return;
    if (timer) clearTimeout(timer);
    const user = uid;
    timer = setTimeout(() => void push(user, state), PUSH_DELAY_MS);
  });
  document.addEventListener("visibilitychange", () => {
    if (!uid) return;
    if (document.visibilityState === "hidden") {
      if (timer) clearTimeout(timer);
      timer = null;
      void push(uid, getStories());
    } else void syncNow(uid).catch(() => undefined);
  });
}
