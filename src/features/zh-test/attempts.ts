"use client";
/** Attempts at the Chinese tests, kept in this browser (localStorage). Shared by the test runner and the stage map. */
export const ZH_TESTS_KEY = "chinese-app:zh-tests:v1";
export type ZhAttempt = { at: string; percent: number; correct: number; total: number; passed: boolean };

export function readZhAttempts(id: string): ZhAttempt[] {
  try {
    const all = JSON.parse(localStorage.getItem(ZH_TESTS_KEY) ?? "{}") as Record<string, ZhAttempt[]>;
    return all[id] ?? [];
  } catch {
    return [];
  }
}

export function saveZhAttempt(id: string, a: ZhAttempt) {
  try {
    const all = JSON.parse(localStorage.getItem(ZH_TESTS_KEY) ?? "{}") as Record<string, ZhAttempt[]>;
    all[id] = [a, ...(all[id] ?? [])].slice(0, 10);
    localStorage.setItem(ZH_TESTS_KEY, JSON.stringify(all));
  } catch {
    // storage blocked: the result is still shown
  }
}

/** Best result of a test: { percent, passed } or null when never done. */
export function bestZhAttempt(id: string): { percent: number; passed: boolean } | null {
  const a = readZhAttempts(id);
  if (!a.length) return null;
  return { percent: Math.max(...a.map((x) => x.percent)), passed: a.some((x) => x.passed) };
}
