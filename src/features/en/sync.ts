"use client";
/**
 * Mirrors the English progress of the signed-in account to Supabase `public.progress_en`
 * (supabase/en-progress.sql). Same rules as the Chinese sync (account.ts): pull on sign-in, newest
 * copy wins, push 1.5 s after the last change. If the table does not exist yet the account copy stays
 * in this browser and the status says so — nothing breaks.
 */
import { useSyncExternalStore } from "react";
import { isMissingTable, resolveEnSync } from "@/domain/en-sync";
import { ACCOUNTS_ENABLED, onAccountChange, supabase } from "@/features/account/account";
import { EMPTY_EN, isEmptyEn, onEnLocalChange, parseEnProgress, readEnGuest, readEnUserCache, setEnScope, writeEnUserCache, type EnProgress } from "./progress";

export type EnSyncStatus = "off" | "guest" | "syncing" | "saved" | "error" | "no-table";

const TABLE = "progress_en";
const PUSH_DELAY_MS = 1500;
let status: EnSyncStatus = ACCOUNTS_ENABLED ? "guest" : "off";
const listeners = new Set<() => void>();
let started = false;
let uid: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: { state: EnProgress; updatedAt: string } | null = null;

function setStatus(s: EnSyncStatus) {
  status = s;
  for (const l of listeners) l();
}

async function push(user: string, state: EnProgress, updatedAt: string) {
  if (status === "no-table") return;
  setStatus("syncing");
  const { error } = await supabase().from(TABLE).upsert({ user_id: user, state, updated_at: updatedAt });
  if (error) return setStatus(isMissingTable(error) ? "no-table" : "error");
  const cache = readEnUserCache(user);
  if (cache && cache.updatedAt === updatedAt) writeEnUserCache(user, { ...cache, syncedAt: updatedAt });
  setStatus(pending ? "syncing" : "saved");
}

function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const p = pending;
  pending = null;
  if (p && uid) void push(uid, p.state, p.updatedAt);
}

async function syncNow(user: string) {
  setStatus("syncing");
  const { data, error } = await supabase().from(TABLE).select("state, updated_at").eq("user_id", user).maybeSingle();
  if (uid !== user) return;
  if (error) {
    setEnScope(user, readEnUserCache(user)?.state);
    return setStatus(isMissingTable(error) ? "no-table" : "error");
  }
  const remote = data ? { state: parseEnProgress(data.state), updatedAt: new Date(data.updated_at as string).toISOString() } : null;
  const decision = resolveEnSync(remote, readEnUserCache(user), readEnGuest(), isEmptyEn);
  if (decision.use === "empty") {
    setEnScope(user, EMPTY_EN);
    return setStatus("saved");
  }
  writeEnUserCache(user, { state: decision.state, updatedAt: decision.updatedAt, syncedAt: decision.use === "remote" ? decision.updatedAt : null });
  setEnScope(user, decision.state);
  if (decision.use === "local") await push(user, decision.state, decision.updatedAt);
  else setStatus("saved");
}

/** Started once from the English layout. */
export function startEnSync() {
  if (!ACCOUNTS_ENABLED || started) return;
  started = true;
  onAccountChange((next) => {
    if (next === uid) return;
    if (uid) flush();
    uid = next;
    if (!next) {
      onEnLocalChange(null);
      setEnScope(null);
      return setStatus("guest");
    }
    setEnScope(next, readEnUserCache(next)?.state);
    onEnLocalChange((state, updatedAt) => {
      pending = { state, updatedAt };
      if (status !== "no-table") setStatus("syncing");
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, PUSH_DELAY_MS);
    });
    void syncNow(next).catch(() => setStatus("error"));
  });
  document.addEventListener("visibilitychange", () => {
    if (!uid) return;
    if (document.visibilityState === "hidden") flush();
    else if (!pending && status !== "no-table") void syncNow(uid).catch(() => setStatus("error"));
  });
}

export function useEnSyncStatus(): EnSyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => (ACCOUNTS_ENABLED ? "guest" : "off"),
  );
}
