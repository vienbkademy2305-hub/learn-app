/** Lesson 0 practice (docs/PHASE6_PINYIN_PLAN.md): hear a syllable, pick its tone or its spelling. Pure. */
import { shuffle, type Choice, type Rng } from "./exercises";
import { syllableToMarked } from "./pinyin";

export interface ListenQuestion {
  kind: "tone" | "sound";
  /** character read aloud by the device voice */
  hanzi: string;
  /** tone-marked pinyin of the answer */
  answer: string;
  choices: Choice[];
}

/** Characters whose reading the voice may pick differently when read alone. */
const POLYPHONES = new Set([..."了的得地还长行重着觉发都和为少好中种数只难乐教便量背相"]);

/**
 * Single-character words from a snapshot → tone quiz pool. Keys look like "ma1-5988"
 * (pinyin key + code points). Neutral tones, polyphones and characters listed under
 * several readings are skipped.
 */
export function tonePool(words: Array<{ slug: string; simplified: string }>): Array<{ hanzi: string; base: string; tone: number }> {
  const byHanzi = new Map<string, Array<{ base: string; tone: number }>>();
  for (const w of words) {
    if ([...w.simplified].length !== 1 || POLYPHONES.has(w.simplified)) continue;
    const m = /^([a-z]+)([1-5])-/.exec(w.slug);
    if (!m) continue;
    byHanzi.set(w.simplified, [...(byHanzi.get(w.simplified) ?? []), { base: m[1]!, tone: Number(m[2]) }]);
  }
  return [...byHanzi.entries()].filter(([, r]) => r.length === 1 && r[0]!.tone <= 4).map(([hanzi, r]) => ({ hanzi, ...r[0]! }));
}

/** Hear a character → choose among the four tones of its syllable. */
export function buildToneQuiz(pool: ReturnType<typeof tonePool>, rng: Rng, count = 12): ListenQuestion[] {
  return shuffle(pool, rng)
    .slice(0, count)
    .map((c) => ({
      kind: "tone" as const,
      hanzi: c.hanzi,
      answer: syllableToMarked(`${c.base}${c.tone}`),
      choices: [1, 2, 3, 4].map((t) => ({ text: syllableToMarked(`${c.base}${t}`), sub: `thanh ${t}`, correct: t === c.tone })),
    }));
}

/** Hear one syllable of a confusable set (zhī / jī / zī…) → choose how it is spelled. */
export function buildSoundQuiz(sets: Array<Array<{ hanzi: string; pinyin: string }>>, rng: Rng, count = 12): ListenQuestion[] {
  const questions: ListenQuestion[] = [];
  let pass = 0;
  while (questions.length < count && sets.length > 0 && pass < 10) {
    for (const set of shuffle(sets, rng)) {
      if (questions.length >= count) break;
      const target = set[Math.floor(rng() * set.length)]!;
      questions.push({
        kind: "sound",
        hanzi: target.hanzi,
        answer: target.pinyin,
        choices: shuffle(set.map((s) => ({ text: s.pinyin, correct: s === target })), rng),
      });
    }
    pass++;
  }
  return questions;
}
