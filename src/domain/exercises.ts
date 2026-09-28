/**
 * Exercise generation (docs/PHASE3_EXERCISES_PLAN.md). Pure functions over
 * lesson data; randomness is injected so tests can use a fixed seed.
 */
import { pinyinCompare, pinyinToneless, syllableToMarked } from "./pinyin";

export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) — for tests and reproducible sets. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Input shapes (subset of the content snapshot) ─────────────────────────────

export interface ExSentence {
  key: string;
  simplified: string;
  pinyin: string | null;
  vi: string | null;
  audio: { normal?: string; slow?: string };
  tokens: Array<{ text: string; word: string | null }>;
}

export interface ExWord {
  slug: string;
  simplified: string;
  pinyin: string;
  meaning: string | null;
  chars: Array<{ hanzi: string; pinyin: string | null; stroke: string | null }>;
}

// ── Questions ─────────────────────────────────────────────────────────────────

export interface Choice {
  text: string;
  sub?: string;
  correct: boolean;
}

export type ListeningQuestion =
  | { kind: "listen-meaning"; sentence: ExSentence; choices: Choice[] }
  | { kind: "listen-fill"; sentence: ExSentence; blank: number; choices: Choice[] };

export type SentenceQuestion =
  | { kind: "reorder"; sentence: ExSentence; pieces: Array<{ id: number; text: string }>; answer: string[] }
  | { kind: "pinyin"; word: ExWord };

export interface CharacterQuestion {
  kind: "write-char";
  hanzi: string;
  stroke: string;
  pinyin: string | null;
  word: ExWord;
}

const hasAudio = (s: ExSentence) => Boolean(s.audio.normal || s.audio.slow);

/** Listening: half "hear → meaning", half "hear → missing word". */
export function buildListening(sentences: ExSentence[], words: ExWord[], rng: Rng, count = 8): ListeningQuestion[] {
  const playable = shuffle(sentences.filter(hasAudio), rng);
  const lessonWords = new Map(words.map((w) => [w.slug, w]));
  const questions: ListeningQuestion[] = [];

  for (const s of playable) {
    if (questions.length >= count) break;
    const wantFill = questions.length % 2 === 1;

    const fillable = s.tokens
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.word && lessonWords.has(t.word));
    if (wantFill && fillable.length > 0 && s.tokens.length >= 2) {
      const { t, i } = fillable[Math.floor(rng() * fillable.length)]!;
      const target = lessonWords.get(t.word!)!;
      const distractors = shuffle(
        words.filter((w) => w.simplified !== target.simplified && !s.tokens.some((x) => x.text === w.simplified)),
        rng,
      )
        .sort((a, b) => Math.abs(a.simplified.length - target.simplified.length) - Math.abs(b.simplified.length - target.simplified.length))
        .slice(0, 3);
      if (distractors.length === 3) {
        questions.push({
          kind: "listen-fill",
          sentence: s,
          blank: i,
          choices: shuffle(
            [target, ...distractors].map((w) => ({ text: w.simplified, sub: w.pinyin, correct: w === target })),
            rng,
          ),
        });
        continue;
      }
    }

    if (!s.vi) continue;
    const others = shuffle(
      [...new Set(sentences.filter((o) => o.key !== s.key && o.vi && o.vi !== s.vi).map((o) => o.vi!))],
      rng,
    ).slice(0, 3);
    if (others.length < 3) continue;
    questions.push({
      kind: "listen-meaning",
      sentence: s,
      choices: shuffle([{ text: s.vi, correct: true }, ...others.map((text) => ({ text, correct: false }))], rng),
    });
  }
  return questions;
}

/** Writing: alternate "reorder the words" and "type the pinyin". */
export function buildSentenceWriting(sentences: ExSentence[], words: ExWord[], rng: Rng, count = 8): SentenceQuestion[] {
  const reorderable = shuffle(
    sentences.filter((s) => s.vi && s.tokens.length >= 3 && s.tokens.length <= 7),
    rng,
  );
  const pinyinWords = shuffle(words, rng);
  const questions: SentenceQuestion[] = [];
  let r = 0;
  let p = 0;
  while (questions.length < count && (r < reorderable.length || p < pinyinWords.length)) {
    const wantReorder = questions.length % 2 === 0;
    if ((wantReorder && r < reorderable.length) || p >= pinyinWords.length) {
      const s = reorderable[r++]!;
      const answer = s.tokens.map((t) => t.text);
      let pieces = answer.map((text, id) => ({ id, text }));
      // Reshuffle until the order differs from the answer (unless every piece is identical).
      for (let tries = 0; tries < 10; tries++) {
        pieces = shuffle(pieces, rng);
        if (pieces.map((x) => x.text).join("") !== answer.join("")) break;
      }
      questions.push({ kind: "reorder", sentence: s, pieces, answer });
    } else {
      questions.push({ kind: "pinyin", word: pinyinWords[p++]! });
    }
  }
  return questions;
}

/** Character writing: distinct characters of the lesson that have stroke data. */
export function buildCharacterWriting(words: ExWord[], rng: Rng, count = 6): CharacterQuestion[] {
  const seen = new Set<string>();
  const pool: CharacterQuestion[] = [];
  for (const w of words) {
    for (const c of w.chars) {
      if (!c.stroke || seen.has(c.hanzi)) continue;
      seen.add(c.hanzi);
      pool.push({ kind: "write-char", hanzi: c.hanzi, stroke: c.stroke, pinyin: c.pinyin, word: w });
    }
  }
  return shuffle(pool, rng).slice(0, count);
}

// ── Checking ──────────────────────────────────────────────────────────────────

/** Tone-marked form of a canonical pinyin key ("ni3hao3" → "nǐhǎo"). */
export function keyToMarked(pinyinKey: string): string {
  return (pinyinKey.match(/[a-zv:]+[1-5]/g) ?? [pinyinKey]).map(syllableToMarked).join("");
}

/**
 * Grades typed pinyin against a word's pinyin key.
 * Accepts tone marks ("nǐ hǎo") or tone numbers ("ni3hao3"); "tone" = right letters, wrong/missing tones.
 */
export function checkPinyin(input: string, pinyinKey: string): "correct" | "tone" | "wrong" {
  const cleaned = input.trim().toLowerCase().replace(/u:/g, "ü");
  if (!cleaned) return "wrong";
  const typed = /[1-5]/.test(cleaned)
    ? (cleaned.replace(/[\s'’]/g, "").match(/[a-züv]+[1-5]?/g) ?? []).map(syllableToMarked).join("")
    : cleaned;
  const target = keyToMarked(pinyinKey);
  if (pinyinCompare(typed) === pinyinCompare(target)) return "correct";
  if (pinyinToneless(typed) === pinyinToneless(target)) return "tone";
  return "wrong";
}

export function checkReorder(chosen: string[], answer: string[]): boolean {
  return chosen.join("") === answer.join("");
}

