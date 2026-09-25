/**
 * Pinyin normalization (docs/DATA_MAPPING.md §2). Pure, no I/O.
 *
 * Sources disagree on format: CVDICT and complete-hsk-vocabulary use numbered
 * syllables ("ni3 hao3"), hsk-sentences-audio tokens use tone marks ("nǐ"),
 * xue-hanzi separates syllables with U+200B. Words are keyed by pinyinKey();
 * marked strings are compared after converting both sides with pinyinCompare().
 */

const TONE_MARKS: Record<string, [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const SEPARATORS = /[\s'’·\u200b,.\-]/g;

/** Canonical word key: lowercase numbered syllables, neutral tone = 5, ü = v. "Nǐ" style input is not accepted. */
export function pinyinKey(numbered: string): string {
  return numbered
    .normalize("NFC")
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v")
    .split(/[\s'’·\u200b,]+/)
    .filter(Boolean)
    .map((syl) => (/\d$/.test(syl) || !/^[a-z]+$/.test(syl) ? syl : `${syl}5`))
    .join("");
}

/** Converts one numbered syllable ("lv4", "nu:3", "ma5") to tone-marked form ("lǜ", "nǚ", "ma"). */
export function syllableToMarked(syllable: string): string {
  const match = /^([A-Za-zÜüv:]+)([1-5])?$/.exec(syllable);
  if (!match) return syllable;
  const base = match[1]!.replace(/u:/g, "ü").replace(/U:/g, "Ü").replace(/v/g, "ü").replace(/V/g, "Ü");
  const tone = match[2] ? Number(match[2]) : 5;
  if (tone === 5) return base;

  const lower = base.toLowerCase();
  let index: number;
  if (lower.includes("a")) index = lower.indexOf("a");
  else if (lower.includes("e")) index = lower.indexOf("e");
  else if (lower.includes("ou")) index = lower.indexOf("o");
  else {
    index = -1;
    for (let i = lower.length - 1; i >= 0; i--) {
      if ("iouü".includes(lower[i]!)) {
        index = i;
        break;
      }
    }
  }
  if (index < 0) return base; // syllabic consonants such as "m2", "ng2", "r5"

  const vowel = lower[index]!;
  let marked = TONE_MARKS[vowel]![tone - 1]!;
  if (base[index] !== vowel) marked = marked.toUpperCase();
  return base.slice(0, index) + marked + base.slice(index + 1);
}

/** "ni3 hao3" → "nǐ hǎo" (syllables stay space-separated). */
export function numberedToMarked(numbered: string): string {
  return numbered
    .trim()
    .split(/\s+/)
    .map(syllableToMarked)
    .join(" ");
}

/** Normalizes tone-marked pinyin for equality checks across sources. */
export function pinyinCompare(pinyin: string): string {
  return pinyin.normalize("NFC").toLowerCase().replace(SEPARATORS, "").replace(/v/g, "ü");
}

/** Like pinyinCompare() but drops tone marks (keeps ü), for tone-sandhi fallbacks (不 bú/bù). */
export function pinyinToneless(pinyin: string): string {
  return pinyinCompare(pinyin)
    .normalize("NFD")
    .replace(/[\u0300\u0301\u0304\u030c]/g, "")
    .normalize("NFC");
}
