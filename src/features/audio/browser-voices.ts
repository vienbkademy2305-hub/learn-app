"use client";
/**
 * Picks the device's best text-to-speech voice for English or Mandarin, and remembers the learner's own pick.
 * Browsers list their old robotic voices first (Windows: Microsoft Huihui / Hazel / David), while the natural
 * ones ("Microsoft Xiaoxiao Online (Natural)" in Edge, "Google 普通话" / "Google UK English Female" in Chrome,
 * "Premium" / "Enhanced" voices on iPhone) come later — so voices are ranked instead of taking the first match.
 */

export type VoiceLang = "en" | "zh";
type VoiceLike = Pick<SpeechSynthesisVoice, "name" | "lang" | "localService">;

/** "auto" = best ranked voice; "recorded" (English only) = the Kokoro files, then the best voice; else a voice name. */
export type BrowserVoicePick = "auto" | "recorded" | string;

const norm = (lang: string) => lang.replace("_", "-");

export function voiceMatchesLang(v: VoiceLike, lang: VoiceLang): boolean {
  const l = norm(v.lang);
  if (lang === "en") return /^en(-|$)/i.test(l);
  return /^(zh|cmn)(-|$)/i.test(l) && !/HK|TW|yue|Hant/i.test(l) && !/粤|粵|Cantonese|Taiwan|臺灣|台灣/i.test(v.name);
}

/** Higher is better. Exported for tests. */
export function voiceScore(v: VoiceLike, lang: VoiceLang): number {
  const name = v.name;
  const l = norm(v.lang);
  let s = 0;
  if (/natural/i.test(name)) s += 60;
  if (/neural|premium|enhanced|wavenet/i.test(name)) s += 45;
  if (/online/i.test(name)) s += 25;
  if (/^google\b/i.test(name)) s += 35;
  if (!v.localService) s += 5;
  // Old Windows / eSpeak voices that sound robotic.
  if (/\b(huihui|kangkang|yaoyao|hazel|george|susan|david|zira|mark)\b/i.test(name) && !/natural|online/i.test(name)) s -= 30;
  if (/espeak|compact/i.test(name)) s -= 40;
  if (lang === "en") {
    if (l === "en-GB") s += 10;
    else if (l === "en-US") s += 8;
    else if (/^en-(AU|IE|CA|NZ)$/i.test(l)) s += 4;
  } else if (/^zh-CN$|^cmn-CN$|Hans/i.test(l)) s += 10;
  return s;
}

/** Voices for a language, best first. */
export function rankVoices<V extends VoiceLike>(voices: V[], lang: VoiceLang): V[] {
  return voices
    .filter((v) => voiceMatchesLang(v, lang))
    .map((v, i) => ({ v, i, s: voiceScore(v, lang) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}

/** A voice good enough to use instead of the recorded English files when the learner has not picked anything. */
export const isNaturalVoice = (v: VoiceLike, lang: VoiceLang) => voiceScore(v, lang) >= 35;

const storeKey = (lang: VoiceLang) => `chinese-app:browser-voice:${lang}`;
const listeners = new Set<() => void>();

export function getBrowserVoicePick(lang: VoiceLang): BrowserVoicePick {
  try {
    return localStorage.getItem(storeKey(lang)) || "auto";
  } catch {
    return "auto";
  }
}

export function setBrowserVoicePick(lang: VoiceLang, pick: BrowserVoicePick) {
  try {
    localStorage.setItem(storeKey(lang), pick);
  } catch {
    /* private mode / blocked storage */
  }
  for (const l of listeners) l();
}

export function onBrowserVoicePickChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function deviceVoices(lang: VoiceLang): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return rankVoices(window.speechSynthesis.getVoices(), lang);
}

/** The voice to speak with: the learner's pick if the device still has it, otherwise the best ranked one. */
export function chosenVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const ranked = deviceVoices(lang);
  const pick = getBrowserVoicePick(lang);
  return ranked.find((v) => v.name === pick) ?? ranked[0] ?? null;
}

/** A second voice for the other dialogue speaker: the next best one with another name (prefer another accent/engine). */
export function secondVoice(lang: VoiceLang, first: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null {
  const ranked = deviceVoices(lang).filter((v) => v.name !== first?.name);
  if (!first) return ranked[0] ?? null;
  const firstNatural = isNaturalVoice(first, lang);
  return ranked.find((v) => isNaturalVoice(v, lang) === firstNatural) ?? ranked[0] ?? null;
}
