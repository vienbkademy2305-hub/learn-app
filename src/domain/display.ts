/** Pure helpers that turn canonical data into what the learner sees (Vietnamese-first). */

export interface CharSinoViet {
  hanzi: string;
  sinoViet: string[];
}

/** Hán Việt of a word = primary reading of each character. null unless every character has one. */
export function joinSinoViet(chars: CharSinoViet[]): string | null {
  if (chars.length === 0) return null;
  const parts = chars.map((c) => c.sinoViet[0]);
  return parts.every(Boolean) ? parts.join(" ") : null;
}

export interface RawSense {
  text: string;
  /** CEDICT headword the sense came from, e.g. "白 白 [Bai2]". */
  recordId: string;
}

const MEASURE_WORD = /^(?:LT|CL)\s*:\s*/;

/**
 * Orders and cleans CVDICT senses for display:
 * - senses of lowercase readings first (capitalized CEDICT lines are surnames/proper nouns),
 * - "LT:/CL:" lines become a separate measure-word list ("個|个[ge4], 位[wei4]" → ["个", "位"]),
 * - duplicates removed.
 */
export function splitSenses(senses: RawSense[]): { meanings: string[]; measureWords: string[] } {
  const isProper = (s: RawSense) => /\[[A-Z]/.test(s.recordId);
  const ordered = [...senses.filter((s) => !isProper(s)), ...senses.filter(isProper)];
  const meanings: string[] = [];
  const measureWords: string[] = [];
  for (const { text } of ordered) {
    if (MEASURE_WORD.test(text)) {
      for (const part of text.replace(MEASURE_WORD, "").split(/[,，]/)) {
        const hanzi = part.trim().replace(/\[.*?\]/g, "").split("|").pop()?.trim();
        if (hanzi && !measureWords.includes(hanzi)) measureWords.push(hanzi);
      }
    } else if (!meanings.includes(text)) {
      meanings.push(text);
    }
  }
  return { meanings, measureWords };
}

/**
 * Aligns tokens (which omit punctuation) with the original sentence text so it
 * can be rendered completely, with each token linkable to its word.
 */
export function segmentSentence<T extends { text: string; word: string | null }>(text: string, tokens: T[]): Array<{ text: string; word: string | null }> {
  const parts: Array<{ text: string; word: string | null }> = [];
  let cursor = 0;
  for (const token of tokens) {
    const at = text.indexOf(token.text, cursor);
    if (at < 0) continue;
    if (at > cursor) parts.push({ text: text.slice(cursor, at), word: null });
    parts.push({ text: token.text, word: token.word });
    cursor = at + token.text.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), word: null });
  return parts;
}

/** ASCII-only word slug for static hosting: "<pinyin_key>-<hex codepoints>", e.g. "ni3hao3-4f60-597d". */
export function wordSlug(simplified: string, pinyinKey: string): string {
  const cps = [...simplified].map((c) => c.codePointAt(0)!.toString(16)).join("-");
  return `${pinyinKey.replace(/[^a-z0-9]/g, "")}-${cps}`;
}
