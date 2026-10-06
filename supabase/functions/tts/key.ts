/**
 * Cache key of one clip: sha256 of "<voice id>\n<normalised text>", hex. The mp3 lives at tts/v1/<key>.mp3.
 * MUST stay identical to src/features/tts/key.ts (tests/tts-key.test.ts checks both).
 */
export const normaliseTtsText = (text: string) => text.replace(/\s+/g, " ").trim();

export async function ttsKey(voice: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${voice}\n${normaliseTtsText(text)}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ttsPath = (key: string) => `v1/${key}.mp3`;
