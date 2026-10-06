"use client";
/**
 * Browser side of the TTS service (docs/TTS_SERVICE_PLAN.md). Language-neutral: callers pass a voice id
 * ("google:en-GB-Neural2-C") and a text, and get back an mp3 URL — or null, and then use their own fallback
 * (recorded Kokoro files, browser voices). The provider key never reaches the browser.
 *
 * 1. Try the public file tts/v1/<sha256>.mp3 in Supabase Storage (no function call, no cost).
 * 2. Otherwise ask the `tts` Edge Function, which creates it for allowed accounts under the monthly cap.
 */
import { supabase } from "@/features/account/account";
import { ttsKey, ttsPath } from "./key";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const TTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/tts`;

export type TtsVoice = { id: string; lang: string; gender: "female" | "male" | "neutral"; label: string };
export type TtsLang = "en" | "zh";
/** "recorded" = the files made by `pnpm en:audio` (and the browser voice after them). */
export type VoiceChoice = { main: string; second: string };

/** Site-wide default until the learner picks a voice (set at build time, e.g. after pre-generating a voice). */
const DEFAULTS: Record<TtsLang, VoiceChoice> = {
  en: { main: process.env.NEXT_PUBLIC_TTS_VOICE_EN || "recorded", second: process.env.NEXT_PUBLIC_TTS_VOICE_EN_2 || "recorded" },
  zh: { main: process.env.NEXT_PUBLIC_TTS_VOICE_ZH || "recorded", second: process.env.NEXT_PUBLIC_TTS_VOICE_ZH_2 || "recorded" },
};
const storeKey = (lang: TtsLang) => `chinese-app:tts-voice:${lang}`;
const listeners = new Set<() => void>();

export function getVoiceChoice(lang: TtsLang): VoiceChoice {
  try {
    const raw = localStorage.getItem(storeKey(lang));
    if (raw) return { ...DEFAULTS[lang], ...(JSON.parse(raw) as Partial<VoiceChoice>) };
  } catch {
    /* private mode / blocked storage: defaults */
  }
  return DEFAULTS[lang];
}

export function setVoiceChoice(lang: TtsLang, choice: VoiceChoice) {
  try {
    localStorage.setItem(storeKey(lang), JSON.stringify(choice));
  } catch {
    /* ignore */
  }
  urls.clear();
  for (const l of listeners) l();
}

export function onVoiceChoiceChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let voiceList: Promise<{ voices: TtsVoice[]; cap: number; used: number } | null> | null = null;
/** Voices offered by the service (null when the service is not deployed / not configured). */
export function loadTtsVoices(): Promise<{ voices: TtsVoice[]; cap: number; used: number } | null> {
  if (!TTS_ENABLED) return Promise.resolve(null);
  voiceList ??= fetch(`${FUNCTION_URL}?langs=en,cmn`, { headers: { apikey: SUPABASE_KEY } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return voiceList;
}

/** text+voice → URL (or null = not available: use the fallback). Remembered for this page. */
const urls = new Map<string, Promise<string | null>>();

async function exists(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

async function resolve(voice: string, text: string): Promise<string | null> {
  const key = await ttsKey(voice, text);
  const direct = `${SUPABASE_URL}/storage/v1/object/public/tts/${ttsPath(key)}`;
  if (await exists(direct)) return direct;
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    const r = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: SUPABASE_KEY, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, voice }),
    });
    if (!r.ok) return null; // 403 not allowed / 429 monthly cap / 500 provider error → fallback
    return ((await r.json()) as { url?: string }).url ?? null;
  } catch {
    return null;
  }
}

export function ttsUrl(voice: string, text: string): Promise<string | null> {
  if (!TTS_ENABLED || !voice || voice === "recorded") return Promise.resolve(null);
  const k = `${voice}\n${text}`;
  let p = urls.get(k);
  if (!p) {
    p = resolve(voice, text);
    urls.set(k, p);
    // a failure is not remembered for ever: the clip may be created later (e.g. next month)
    void p.then((u) => u === null && setTimeout(() => urls.delete(k), 60_000));
  }
  return p;
}
