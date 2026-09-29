/**
 * Which copy of the English progress wins when signing in (same rules as resolveSync in account.ts):
 * the server copy, unless this browser has newer changes not yet pushed; a new account adopts the
 * guest progress of this browser. Last writer wins for the whole state.
 */
export interface Stamped<T> { state: T; updatedAt: string }
export interface Cached<T> extends Stamped<T> { syncedAt: string | null }
export type EnSyncDecision<T> = { use: "remote"; state: T; updatedAt: string } | { use: "local"; state: T; updatedAt: string } | { use: "empty" };

export function resolveEnSync<T>(remote: Stamped<T> | null, cache: Cached<T> | null, guest: T, isEmpty: (s: T) => boolean, now = new Date()): EnSyncDecision<T> {
  const unsynced = cache && (!cache.syncedAt || cache.updatedAt > cache.syncedAt);
  if (remote) {
    if (cache && unsynced && cache.updatedAt > remote.updatedAt) return { use: "local", state: cache.state, updatedAt: cache.updatedAt };
    return { use: "remote", state: remote.state, updatedAt: remote.updatedAt };
  }
  if (cache && !isEmpty(cache.state)) return { use: "local", state: cache.state, updatedAt: cache.updatedAt };
  if (!isEmpty(guest)) return { use: "local", state: guest, updatedAt: now.toISOString() };
  return { use: "empty" };
}

/** PostgREST / Postgres codes meaning "table not created yet" (supabase/en-progress.sql not run). */
export const isMissingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "PGRST205" || e.code === "42P01" || /could not find the table|does not exist/i.test(e.message ?? ""));
