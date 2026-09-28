import { describe, expect, it } from "vitest";
import { emailToUsername, isEmptyProgress, normalizeUsername, resolveSync, usernameError, usernameToEmail } from "../src/domain/account";
import { EMPTY_PROGRESS, setLearned, type ProgressState } from "../src/domain/progress";

const withWord = (w: string): ProgressState => setLearned(EMPTY_PROGRESS, w, true, new Date("2026-09-01T00:00:00Z"));

describe("usernames", () => {
  it("normalizes and validates", () => {
    expect(normalizeUsername("  An.Nguyen ")).toBe("an.nguyen");
    expect(usernameError("An.Nguyen")).toBeNull();
    expect(usernameError("ab")).toMatch(/3–32/);
    expect(usernameError("nguyễn")).toMatch(/không dấu/);
    expect(usernameError("-abc")).not.toBeNull();
    expect(usernameError("")).toBe("Nhập tên tài khoản.");
  });

  it("maps to a hidden e-mail and back", () => {
    expect(usernameToEmail(" Tung ", "learn-app.local")).toBe("tung@learn-app.local");
    expect(emailToUsername("tung@learn-app.local")).toBe("tung");
    expect(emailToUsername(undefined)).toBe("");
  });
});

describe("resolveSync", () => {
  const T1 = "2026-09-28T10:00:00.000Z";
  const T2 = "2026-09-28T11:00:00.000Z";
  const T3 = "2026-09-28T12:00:00.000Z";
  const now = new Date(T3);

  it("takes the server copy when nothing local is pending", () => {
    const d = resolveSync({ state: withWord("a"), updatedAt: T2 }, { state: withWord("b"), updatedAt: T1, syncedAt: T1 }, EMPTY_PROGRESS, now);
    expect(d).toMatchObject({ use: "remote", updatedAt: T2 });
    expect(Object.keys(d.state.learned)).toEqual(["a"]);
  });

  it("keeps and pushes local edits newer than the server copy", () => {
    const d = resolveSync({ state: withWord("a"), updatedAt: T1 }, { state: withWord("b"), updatedAt: T3, syncedAt: T1 }, EMPTY_PROGRESS, now);
    expect(d).toMatchObject({ use: "local", push: true, updatedAt: T3 });
  });

  it("prefers the server when it changed after the local edit (edited on another device later)", () => {
    const d = resolveSync({ state: withWord("a"), updatedAt: T3 }, { state: withWord("b"), updatedAt: T2, syncedAt: T1 }, EMPTY_PROGRESS, now);
    expect(d.use).toBe("remote");
  });

  it("a new account adopts this browser's guest progress, otherwise starts empty", () => {
    expect(resolveSync(null, null, withWord("g"), now)).toMatchObject({ use: "local", push: true, updatedAt: T3 });
    expect(resolveSync(null, null, EMPTY_PROGRESS, now).use).toBe("empty");
  });

  it("uploads a non-empty cache when the server has no row yet", () => {
    expect(resolveSync(null, { state: withWord("b"), updatedAt: T2, syncedAt: null }, withWord("g"), now)).toMatchObject({ use: "local", updatedAt: T2 });
  });

  it("treats a state with only empty maps as empty", () => {
    expect(isEmptyProgress({ ...EMPTY_PROGRESS, exercises: {}, saved: {} })).toBe(true);
    expect(isEmptyProgress(withWord("a"))).toBe(false);
  });
});
