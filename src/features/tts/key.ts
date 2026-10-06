/**
 * Cache key of one TTS clip — MUST stay identical to supabase/functions/tts/key.ts (tests/tts-key.test.ts).
 */
export const normaliseTtsText = (text: string) => text.replace(/\s+/g, " ").trim();

export async function ttsKey(voice: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${voice}\n${normaliseTtsText(text)}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ttsPath = (key: string) => `v1/${key}.mp3`;
