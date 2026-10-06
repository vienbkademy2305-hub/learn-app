/**
 * Which TTS voice reads which dialogue speaker. Shared by the browser (src/features/en/speech.tsx) and the
 * pre-generation script (scripts/tts-pregen.ts) so both ask for exactly the same clips.
 */
export const FEMALE_SPEAKER = /^(woman|girl|mother|mum|wife|sister|anna|lan|mai|linh|hoa|sarah|emma|lisa|linda|jane|she|sophie|lucy|ella|mia|hannah|grace|laura|megan|caroline)$/i;
export const MALE_SPEAKER = /^(man|boy|father|dad|husband|brother|tom|nam|duc|khoa|minh|john|david|peter|james|he|marcus|ahmed|sam|luke|jack|kevin|leo|adam|daniel)$/i;

/** "Man: Hello.\nWoman: Hi." → turns; null when the text is not a labelled dialogue (same rule as speech.tsx). */
export function splitDialogue(text: string): Array<{ speaker: string; text: string }> | null {
  const line = /^([A-Z][A-Za-z .'-]{0,20}):\s*(.+)$/;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns = lines.map((l) => line.exec(l)).filter((m): m is RegExpExecArray => !!m).map((m) => ({ speaker: m[1]!, text: m[2]! }));
  return turns.length >= 2 && turns.length === lines.length && new Set(turns.map((t) => t.speaker)).size >= 2 ? turns : null;
}

/** Female names get the female voice of the pair, male names the male one, the others alternate in order. */
export function castSpeakers(speakers: string[], main: string, second: string, genderOf: (voice: string) => string | undefined): Map<string, string> {
  const pair = second && second !== "recorded" && second !== main ? [main, second] : [main];
  const female = pair.find((v) => genderOf(v) === "female") ?? pair[0]!;
  const male = pair.find((v) => genderOf(v) === "male") ?? pair[pair.length - 1]!;
  const cast = new Map<string, string>();
  [...new Set(speakers)].forEach((s, i) => cast.set(s, FEMALE_SPEAKER.test(s) ? female : MALE_SPEAKER.test(s) ? male : pair[i % pair.length]!));
  return cast;
}
