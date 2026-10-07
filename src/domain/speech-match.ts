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
function enTokens(word: string): string[] {
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

/** Longest common subsequence: which expected tokens appear, in order, in the heard ones. */
function lcsMarks(expected: string[], heard: string[]): boolean[] {
  const n = expected.length, m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i]![j] = expected[i] === heard[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const marks = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (expected[i] === heard[j]) (marks[i] = true), i++, j++;
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
  const marks = lcsMarks(flat, heard.split(/\s+/).flatMap(enTokens));
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
