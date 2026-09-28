"use client";
/**
 * Accounts on Supabase (docs/ACCOUNTS_PLAN.md). The site stays static: the browser
 * talks to Supabase Auth (username → hidden e-mail) and to one table,
 * `public.progress`, protected by row-level security so a user only reaches
 * their own row. Without the NEXT_PUBLIC_SUPABASE_* variables accounts are off
 * and the app works exactly as before (guest progress in this browser).
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { emailToUsername, resolveSync, usernameToEmail, type RemoteProgress } from "@/domain/account";
import { parseProgress, type ProgressState } from "@/domain/progress";
import { onLocalChange, readGuestProgress, readUserCache, setProgressScope, writeUserCache } from "@/features/progress/store";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const ACCOUNT_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_ACCOUNT_EMAIL_DOMAIN || "learn-app.local";
export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
/** What the server render (static HTML) shows before the browser knows the session. */
const INITIAL: AccountState = ACCOUNTS_ENABLED ? { status: "loading" } : { status: "disabled" };

/** Push to the server this long after the last change. */
const PUSH_DELAY_MS = 1500;

export type SyncStatus = "idle" | "syncing" | "saved" | "error";
export type AccountState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; uid: string; username: string; sync: SyncStatus };

let client: SupabaseClient | null = null;
let state: AccountState = INITIAL;
const listeners = new Set<() => void>();
let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pending: { state: ProgressState; updatedAt: string } | null = null;

function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "chinese-app:auth" } });
  return client;
}

function set(next: AccountState) {
  state = next;
  for (const l of listeners) l();
}

function setSync(sync: SyncStatus) {
  if (state.status === "signed-in") set({ ...state, sync });
}

async function pull(uid: string): Promise<RemoteProgress | null> {
  const { data, error } = await supabase().from("progress").select("state, updated_at").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data ? { state: parseProgress(data.state), updatedAt: new Date(data.updated_at as string).toISOString() } : null;
}

async function push(uid: string, progress: ProgressState, updatedAt: string) {
  setSync("syncing");
  const { error } = await supabase().from("progress").upsert({ user_id: uid, state: progress, updated_at: updatedAt });
  if (error) {
    setSync("error");
    return false;
  }
  const cache = readUserCache(uid);
  // Only mark as synced if nothing changed locally while the request was in flight.
  if (cache && cache.updatedAt === updatedAt) writeUserCache(uid, { ...cache, syncedAt: updatedAt });
  setSync(pending ? "syncing" : "saved");
  return true;
}

function schedulePush(uid: string) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const p = pending;
    pending = null;
    if (p) void push(uid, p.state, p.updatedAt);
  }, PUSH_DELAY_MS);
}

/** Pull, decide which copy wins, show it, and push if the local copy won. */
async function syncNow(uid: string) {
  setSync("syncing");
  try {
    const decision = resolveSync(await pull(uid), readUserCache(uid), readGuestProgress());
    if (decision.use === "empty") {
      setProgressScope(uid, decision.state);
      setSync("saved");
      return;
    }
    const synced = decision.use === "remote" ? decision.updatedAt : null;
    writeUserCache(uid, { state: decision.state, updatedAt: decision.updatedAt, syncedAt: synced });
    setProgressScope(uid, decision.state);
    if (decision.use === "local") await push(uid, decision.state, decision.updatedAt);
    else setSync("saved");
  } catch {
    // Offline or server error: keep showing the cached copy; changes are pushed later.
    setProgressScope(uid, readUserCache(uid)?.state);
    setSync("error");
  }
}

function signedIn(user: User) {
  const uid = user.id;
  if (state.status === "signed-in" && state.uid === uid) return;
  const shown = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : emailToUsername(user.email);
  set({ status: "signed-in", uid, username: shown, sync: "idle" });
  setProgressScope(uid, readUserCache(uid)?.state);
  onLocalChange((progress, updatedAt) => {
    pending = { state: progress, updatedAt };
    setSync("syncing");
    schedulePush(uid);
  });
  void syncNow(uid);
}

function signedOut() {
  onLocalChange(null);
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  pending = null;
  setProgressScope(null);
  set({ status: "signed-out" });
}

/** Called once from the root layout: restores the session and keeps it in sync. */
export function startAccounts() {
  if (!ACCOUNTS_ENABLED || started) return;
  started = true;
  const sb = supabase();
  sb.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting its own calls inside this callback; defer.
    setTimeout(() => (session?.user ? signedIn(session.user) : signedOut()), 0);
  });
  void sb.auth.getSession().then(({ data }) => (data.session ? signedIn(data.session.user) : signedOut()));
  // Coming back to the tab: flush pending changes, then pick up edits made on another device.
  document.addEventListener("visibilitychange", () => {
    if (state.status !== "signed-in") return;
    const uid = state.uid;
    if (document.visibilityState === "hidden" && pending) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = null;
      const p = pending;
      pending = null;
      void push(uid, p.state, p.updatedAt);
    } else if (document.visibilityState === "visible" && !pending) {
      void syncNow(uid);
    }
  });
}

export async function signIn(username: string, password: string): Promise<string | null> {
  const { error } = await supabase().auth.signInWithPassword({ email: usernameToEmail(username, ACCOUNT_EMAIL_DOMAIN), password });
  if (!error) return null;
  if (/invalid login credentials/i.test(error.message)) return "Sai tên tài khoản hoặc mật khẩu.";
  if (/fetch|network/i.test(error.message)) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  return `Không đăng nhập được: ${error.message}`;
}

/** Pushes what is still pending, then signs out; the account's progress stays cached for next time. */
export async function signOut() {
  if (state.status === "signed-in" && pending) {
    const p = pending;
    pending = null;
    await push(state.uid, p.state, p.updatedAt);
  }
  await supabase().auth.signOut();
}

export async function changePassword(password: string): Promise<string | null> {
  const { error } = await supabase().auth.updateUser({ password });
  return error ? `Không đổi được mật khẩu: ${error.message}` : null;
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => INITIAL,
  );
}

