/**
 * TTS providers behind one interface (docs/TTS_SERVICE_PLAN.md). To switch provider: add an adapter here and set
 * the TTS_PROVIDER secret — the frontend only knows voice ids ("<provider>:<name>") and audio URLs.
 */

export interface Voice {
  /** "<provider>:<provider voice name>", e.g. "google:en-GB-Neural2-C" — part of the cache key, never change it */
  id: string;
  /** BCP-47, e.g. "en-GB", "en-US", "cmn-CN" */
  lang: string;
  gender: "female" | "male" | "neutral";
  label: string;
}

export interface TtsProvider {
  name: string;
  /** Voices this provider offers for the given language prefixes ("en", "cmn"). */
  voices(langs: string[]): Promise<Voice[]>;
  /** MP3 bytes for `text` read by `voice` (an id returned by voices()). */
  synthesize(text: string, voice: Voice): Promise<Uint8Array>;
}

/** Google Cloud Text-to-Speech (REST, API key). Only natural voice families are offered. */
export function googleProvider(apiKey: string): TtsProvider {
  const API = "https://texttospeech.googleapis.com/v1";
  const FAMILIES = /-(Neural2|Chirp3-HD|Wavenet)-/;
  let cache: Voice[] | null = null;
  return {
    name: "google",
    async voices(langs) {
      if (!cache) {
        const r = await fetch(`${API}/voices?key=${encodeURIComponent(apiKey)}`);
        if (!r.ok) throw new Error(`google voices: ${r.status} ${await r.text()}`);
        const body = (await r.json()) as { voices?: Array<{ name: string; languageCodes: string[]; ssmlGender: string }> };
        cache = (body.voices ?? [])
          .filter((v) => FAMILIES.test(v.name))
          .map((v): Voice => ({
            id: `google:${v.name}`,
            lang: v.languageCodes[0] ?? v.name.split("-").slice(0, 2).join("-"),
            gender: v.ssmlGender === "FEMALE" ? "female" : v.ssmlGender === "MALE" ? "male" : "neutral",
            label: v.name.replace(/^[a-z]{2,3}-[A-Z]{2}-/, "").replace(/-/g, " "),
          }))
          .sort((a, b) => a.lang.localeCompare(b.lang) || a.label.localeCompare(b.label));
      }
      return (cache ?? []).filter((v) => langs.some((l) => v.lang.toLowerCase().startsWith(l.toLowerCase())));
    },
    async synthesize(text, voice) {
      const name = voice.id.slice("google:".length);
      const r = await fetch(`${API}/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.lang, name },
          audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
        }),
      });
      if (!r.ok) throw new Error(`google synthesize: ${r.status} ${await r.text()}`);
      const { audioContent } = (await r.json()) as { audioContent: string };
      return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
    },
  };
}

export function providerFromEnv(get: (k: string) => string | undefined): TtsProvider {
  const name = get("TTS_PROVIDER") ?? "google";
  if (name === "google") {
    const key = get("GOOGLE_TTS_KEY");
    if (!key) throw new Error("GOOGLE_TTS_KEY is not set");
    return googleProvider(key);
  }
  throw new Error(`unknown TTS_PROVIDER ${name}`);
}
