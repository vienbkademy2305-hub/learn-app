"use client";
/**
 * Client of the OpenPronounce server (docs/OPENPRONOUNCE_PLAN.md): a Python service that runs on the
 * learner's own computer (Wav2Vec2 models, ~2.4 GB), so it cannot live on GitHub Pages. The page sends the
 * recording + the expected sentence and gets back a 0–100 score and the mispronounced words (IPA).
 */

export const DEFAULT_PRONOUNCE_URL = "http://localhost:8765";
const STORE_KEY = "chinese-app:pronounce-url";

export function getPronounceUrl(): string {
  try {
    return localStorage.getItem(STORE_KEY) || DEFAULT_PRONOUNCE_URL;
  } catch {
    return DEFAULT_PRONOUNCE_URL;
  }
}

export function setPronounceUrl(url: string) {
  try {
    const clean = url.trim().replace(/\/+$/, "");
    if (!clean || clean === DEFAULT_PRONOUNCE_URL) localStorage.removeItem(STORE_KEY);
    else localStorage.setItem(STORE_KEY, clean);
  } catch {
    /* ignore */
  }
}

export type PhoneReport = { expected: string; heard: string; confidence: number };
export type WordError = {
  position: number;
  word: string;
  expected: string;
  actual: string;
  confidence: number;
  phones?: PhoneReport[];
};
export type PronounceResult = {
  score: number;
  transcribe: string;
  differences: { errors: WordError[]; words_with_errors: string[]; phoneme_error_rate: number; word_error_rate?: number };
};

/** Thrown when the server cannot be reached at all (not started, wrong address, blocked by the browser). */
export class PronounceOffline extends Error {}

export async function pronounceHealth(url = getPronounceUrl()): Promise<boolean> {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

let available: { at: number; ok: Promise<boolean> } | null = null;
/** pronounceHealth() remembered for a minute, so each 🎤 press does not wait for a timeout. */
export function pronounceAvailable(): Promise<boolean> {
  if (!available || Date.now() - available.at > 60_000) available = { at: Date.now(), ok: pronounceHealth(getPronounceUrl()) };
  return available.ok;
}

export async function assessPronunciation(blob: Blob, text: string): Promise<PronounceResult> {
  const form = new FormData();
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  form.append("file", blob, `recording.${ext}`);
  form.append("expected_text", text);
  form.append("lang", "en");
  let r: Response;
  try {
    r = await fetch(`${getPronounceUrl()}/pronunciation`, { method: "POST", body: form });
  } catch {
    throw new PronounceOffline();
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as PronounceResult;
}

/** Same normalisation as the server's word split: lower case, letters/digits/apostrophes only. */
export const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

export function scoreTone(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: "Rất tốt", cls: "bg-jade-600 text-white" };
  if (score >= 70) return { label: "Khá", cls: "bg-sky-600 text-white" };
  if (score >= 50) return { label: "Cần luyện thêm", cls: "bg-amber-500 text-white" };
  return { label: "Chưa đạt", cls: "bg-red-600 text-white" };
}
