import { describe, expect, it } from "vitest";
import { isMissingTable, resolveEnSync } from "../src/domain/en-sync";

type S = { n: number };
const empty = (s: S) => s.n === 0;
const T1 = "2026-09-29T01:00:00.000Z";
const T2 = "2026-09-29T02:00:00.000Z";

describe("English progress sync", () => {
  it("takes the server copy unless this browser has newer unpushed changes", () => {
    expect(resolveEnSync({ state: { n: 1 }, updatedAt: T2 }, { state: { n: 2 }, updatedAt: T1, syncedAt: null }, { n: 0 }, empty)).toEqual({ use: "remote", state: { n: 1 }, updatedAt: T2 });
    expect(resolveEnSync({ state: { n: 1 }, updatedAt: T1 }, { state: { n: 2 }, updatedAt: T2, syncedAt: T1 }, { n: 0 }, empty)).toEqual({ use: "local", state: { n: 2 }, updatedAt: T2 });
    // already pushed → server copy is authoritative
    expect(resolveEnSync({ state: { n: 1 }, updatedAt: T1 }, { state: { n: 2 }, updatedAt: T2, syncedAt: T2 }, { n: 0 }, empty).use).toBe("remote");
  });

  it("a new account adopts the guest progress, otherwise starts empty", () => {
    const now = new Date(T2);
    expect(resolveEnSync(null, null, { n: 3 }, empty, now)).toEqual({ use: "local", state: { n: 3 }, updatedAt: T2 });
    expect(resolveEnSync(null, null, { n: 0 }, empty)).toEqual({ use: "empty" });
  });

  it("recognises a missing table", () => {
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.progress_en' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
