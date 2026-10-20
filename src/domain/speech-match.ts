/**
 * Compares what the browser's speech recognition heard with the sentence the learner should have said
 * (English: word by word, Chinese: character by character). Used when the OpenPronounce server is not
 * reachable (phone) and by the "nói từ tiếng Việt" practice.
 */
export type SpeechLang = "en" | "zh";
export interface MatchResult {
  /** 0–100: share of the expected tokens that were heard, in order */
  score: number;
  /** the expected sentence split for display, each piece marked heard or not */
  parts: Array<{ text: string; ok: boolean; token: boolean }>;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numberWords(n: number): string[] {
  if (n < 20) return [ONES[n]!];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)]!, ONES[n % 10]!] : [TENS[n / 10]!];
  if (n < 1000) return [ONES[Math.floor(n / 100)]!, "hundred", ...(n % 100 ? numberWords(n % 100) : [])];
  return [String(n)];
}
const CONTRACTIONS: Record<string, string[]> = {
  "i'm": ["i", "am"], "you're": ["you", "are"], "we're": ["we", "are"], "they're": ["they", "are"], "he's": ["he", "is"], "she's": ["she", "is"],
  "it's": ["it", "is"], "that's": ["that", "is"], "what's": ["what", "is"], "there's": ["there", "is"], "isn't": ["is", "not"], "aren't": ["are", "not"],
  "don't": ["do", "not"], "doesn't": ["does", "not"], "didn't": ["did", "not"], "can't": ["can", "not"], "cannot": ["can", "not"], "won't": ["will", "not"],
  "i've": ["i", "have"], "i'll": ["i", "will"], "i'd": ["i", "would"], "let's": ["let", "us"], "wasn't": ["was", "not"], "haven't": ["have", "not"],
};

/** Comparable English tokens of one written word ("twenty-six" → twenty, six; "26" → twenty, six; "I'm" → i, am). */
export function enTokens(word: string): string[] {
  const w = word.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'-]/g, "");
  if (!w) return [];
  if (CONTRACTIONS[w]) return CONTRACTIONS[w];
  if (/^\d+$/.test(w)) return numberWords(Number(w));
  return w.split("-").map((p) => p.replace(/'s$/, "").replace(/'/g, "")).filter(Boolean);
}

const ZH_DIGITS = "零一二三四五六七八九";
function zhNumber(n: number): string {
  if (n < 10) return ZH_DIGITS[n]!;
  if (n < 20) return "十" + (n % 10 ? ZH_DIGITS[n % 10] : "");
  if (n < 100) return ZH_DIGITS[Math.floor(n / 10)] + "十" + (n % 10 ? ZH_DIGITS[n % 10] : "");
  return [...String(n)].map((d) => ZH_DIGITS[Number(d)]).join("");
}
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const zhHeard = (s: string) => [...s.replace(/\d+/g, (d) => zhNumber(Number(d)))].filter(isHan);

/** Edit distance, for telling a near miss of the recognizer from a wrong word. */
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(up + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length]!;
}

/**
 * English tokens count as the same word when the recognizer was one letter off on a long word
 * (two on a very long one): "restaurant" heard as "restaurent". Short words must match exactly.
 */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const len = Math.min(a.length, b.length);
  if (len < 5 || Math.abs(a.length - b.length) > 1) return false;
  return editDistance(a, b) <= (len >= 9 ? 2 : 1);
}

/** Longest common subsequence: which expected tokens appear, in order, in the heard ones. */
function lcsMarks(expected: string[], heard: string[], same: (a: string, b: string) => boolean = (a, b) => a === b): boolean[] {
  const n = expected.length, m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i]![j] = same(expected[i]!, heard[j]!) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const marks = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (same(expected[i]!, heard[j]!)) (marks[i] = true), i++, j++;
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return marks;
}

/** Best match over the recognizer's alternatives. */
export function matchSpeech(expected: string, heard: string | string[], lang: SpeechLang): MatchResult {
  const alts = (Array.isArray(heard) ? heard : [heard]).filter(Boolean);
  let best: MatchResult | null = null;
  for (const h of alts.length ? alts : [""]) {
    const r = lang === "zh" ? matchZh(expected, h) : matchEn(expected, h);
    if (!best || r.score > best.score) best = r;
  }
  return best!;
}

function matchEn(expected: string, heard: string): MatchResult {
  const pieces = expected.split(/(\s+)/).filter((p) => p !== "");
  const tokenOf = pieces.map((p) => (/\s/.test(p) ? [] : enTokens(p)));
  const flat = tokenOf.flat();
  const marks = lcsMarks(flat, heard.split(/\s+/).flatMap(enTokens), sameWord);
  let k = 0;
  const parts = pieces.map((p, i) => {
    const toks = tokenOf[i]!;
    const ok = toks.every((_, t) => marks[k + t]);
    k += toks.length;
    return { text: p, ok: toks.length === 0 || ok, token: toks.length > 0 };
  });
  return { score: flat.length ? Math.round((marks.filter(Boolean).length / flat.length) * 100) : 0, parts };
}

function matchZh(expected: string, heard: string): MatchResult {
  const chars = [...expected];
  const han = chars.filter(isHan);
  const marks = lcsMarks(han, zhHeard(heard));
  let k = 0;
  const parts = chars.map((c) => (isHan(c) ? { text: c, ok: marks[k++]!, token: true } : { text: c, ok: true, token: false }));
  return { score: han.length ? Math.round((marks.filter(Boolean).length / han.length) * 100) : 0, parts };
}

/** Hint that keeps the first letter of each word: "My name is Lan." → "M_ n___ i_ L__." */
export function firstLetterHint(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z']*/g, (w) => w[0] + "_".repeat(w.length - 1));
}

export type Pace = "slow" | "ok" | "fast";
export interface SpeechAssessment extends MatchResult {
  /** score from the text match alone */
  rawScore: number;
  confidence?: number;
  pace?: Pace;
  /** one short Vietnamese tip, "" when there is nothing to add */
  tip: string;
}

/**
 * matchSpeech + what the recognizer says about itself: a low confidence lowers the score a little (the engine
 * guessed), a correct reading found only in a lower-ranked alternative cannot reach 100, and the speaking
 * speed (tokens per second between first and last sound) gives a pace hint. Engines without confidence
 * (Safari reports 0) are scored on the text match alone.
 */
export function assessSpeech(
  expected: string,
  heard: string | string[],
  lang: SpeechLang,
  meta: { confidence?: number; speechMs?: number } = {},
): SpeechAssessment {
  const alts = (Array.isArray(heard) ? heard : [heard]).filter(Boolean);
  const m = matchSpeech(expected, alts, lang);
  const top = alts.length > 1 ? matchSpeech(expected, alts[0]!, lang).score : m.score;
  let score = m.score;
  if (top < m.score) score = Math.min(score, 95);
  const conf = meta.confidence && meta.confidence > 0 && meta.confidence <= 1 ? meta.confidence : undefined;
  if (conf !== undefined && conf < 0.8) score = Math.round(score * (0.7 + 0.375 * conf));

  const tokens = m.parts.filter((p) => p.token).length;
  let pace: Pace | undefined;
  if (meta.speechMs && meta.speechMs > 300 && tokens >= (lang === "zh" ? 6 : 4)) {
    const perSec = tokens / (meta.speechMs / 1000);
    const [lo, hi] = lang === "zh" ? [1.8, 6.5] : [0.9, 4.2];
    pace = perSec < lo ? "slow" : perSec > hi ? "fast" : "ok";
  }
  const tip =
    conf !== undefined && conf < 0.6
      ? "Máy nghe chưa chắc — nói to, rõ từng từ và ở chỗ yên tĩnh hơn."
      : pace === "slow"
        ? "Bạn nói hơi chậm/ngắt quãng — thử nói liền mạch cả câu."
        : pace === "fast"
          ? "Bạn nói hơi nhanh — chậm lại để phát âm rõ từng từ."
          : "";
  return { ...m, score, rawScore: m.score, confidence: conf, pace, tip };
}
