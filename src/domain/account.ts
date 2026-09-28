/**
 * Accounts (docs/ACCOUNTS_PLAN.md): username rules and which copy of the
 * progress wins when a device syncs with the server. Pure, no I/O.
 */
import { EMPTY_PROGRESS, type ProgressState } from "./progress";

/** 3–32 characters: lowercase letters, digits, dot, dash, underscore; starts with a letter or digit. */
export const USERNAME_RULE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameError(input: string): string | null {
  const u = normalizeUsername(input);
  if (!u) return "Nhập tên tài khoản.";
  if (!USERNAME_RULE.test(u)) return "Tên tài khoản gồm 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.";
  return null;
}

/**
 * Supabase Auth identifies users by e-mail. Accounts here have only a username,
 * so it is mapped to an address on a domain that never receives mail.
 */
export function usernameToEmail(username: string, domain: string): string {
  return `${normalizeUsername(username)}@${domain}`;
}

export function emailToUsername(email: string | undefined | null): string {
  return (email ?? "").split("@")[0] ?? "";
}

/** A device's copy of one account's progress. `updatedAt` = last local change, `syncedAt` = last time it matched the server. */
export interface CachedProgress {
  state: ProgressState;
  updatedAt: string;
  syncedAt: string | null;
}

export interface RemoteProgress {
  state: ProgressState;
  updatedAt: string;
}

export function isEmptyProgress(s: ProgressState): boolean {
  return Object.values(s).every((v) => typeof v !== "object" || v === null || Object.keys(v).length === 0);
}

export type SyncDecision =
  | { use: "remote"; state: ProgressState; updatedAt: string }
  | { use: "local"; state: ProgressState; updatedAt: string; push: true }
  | { use: "empty"; state: ProgressState };

/**
 * On sign-in or when the tab comes back:
 * - local edits made since the last sync that are newer than the server copy are kept and pushed;
 * - otherwise the server copy wins;
 * - a brand-new account (nothing on the server, nothing cached) adopts this browser's guest progress.
 * Last writer wins for the whole state; one learner rarely edits on two devices at the same moment.
 */
export function resolveSync(remote: RemoteProgress | null, cache: CachedProgress | null, guest: ProgressState, now = new Date()): SyncDecision {
  const unsynced = cache && (!cache.syncedAt || cache.updatedAt > cache.syncedAt);
  if (remote) {
    if (cache && unsynced && cache.updatedAt > remote.updatedAt) return { use: "local", state: cache.state, updatedAt: cache.updatedAt, push: true };
    return { use: "remote", state: remote.state, updatedAt: remote.updatedAt };
  }
  if (cache && !isEmptyProgress(cache.state)) return { use: "local", state: cache.state, updatedAt: cache.updatedAt, push: true };
  if (!isEmptyProgress(guest)) return { use: "local", state: guest, updatedAt: now.toISOString(), push: true };
  return { use: "empty", state: EMPTY_PROGRESS };
}
