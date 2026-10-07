/**
 * Grades a word typed from memory on a flashcard: English spelling, Chinese characters or pinyin
 * (tone marks, tone numbers or none).
 */
export interface SpellResult {
  /** 0–100 */
  score: number;
  /** the learner's input split for display: ok = letter also in the right answer, in order */
  marks: Array<{ ch: string; ok: boolean }>;
  /** short Vietnamese verdict */
  note: string;
  /** the right answer split for display: ok = also typed (in order); missing letters are false */
  answer?: Array<{ ch: string; ok: boolean }>;
}

function lev(a: string[], b: string[]): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** Which characters of `input` are part of the longest common subsequence with `target`. */
function inputMarks(input: string[], target: string[]): boolean[] {
  const n = input.length, m = target.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i]![j] = input[i] === target[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const marks = new Array<boolean>(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (input[i] === target[j]) (marks[i] = true), i++, j++;
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return marks;
}

const similarity = (a: string[], b: string[]) => (b.length ? Math.max(0, Math.round((1 - lev(a, b) / Math.max(a.length, b.length)) * 100)) : 0);
const display = (input: string, target: string, norm: (s: string) => string) => {
  const chars = [...input];
  const marks = inputMarks([...norm(input)].length === chars.length ? [...norm(input)] : chars, [...norm(target)]);
  return chars.map((ch, i) => ({ ch, ok: marks[i] ?? false }));
};

const enNorm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().replace(/[.!?,;:]+$/g, "");

export function gradeEnglish(target: string, input: string): SpellResult {
  const t = enNorm(target), i = enNorm(input);
  if (!i) return { score: 0, marks: [], note: "Chưa viết gì." };
  if (i === t) return { score: 100, marks: [...input.trim()].map((ch) => ({ ch, ok: true })), note: "Đúng chính tả!" };
  const score = similarity([...i], [...t]);
  const shown = target.trim();
  const got = inputMarks([...shown.toLowerCase()], [...i]);
  return {
    score,
    marks: display(input.trim(), target, (s) => s.toLowerCase()),
    note: score >= 80 ? "Gần đúng — sai vài chữ cái." : "Chưa đúng — xem đáp án.",
    answer: [...shown].map((ch, k) => ({ ch, ok: got[k]! || ch === " " })),
  };
}

const TONE_MARKS: Record<string, [string, number]> = {};
for (const [base, marks] of Object.entries({ a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", v: "ǖǘǚǜ" }))
  [...marks].forEach((m, k) => (TONE_MARKS[m] = [base, k + 1]));
const isHan = (c: string) => /\p{Script=Han}/u.test(c);

/** "nǐ hǎo" / "ni3 hao3" / "nihao" → letters without tones ("nihao") and the tones written (["3","3"] or []). */
export function splitPinyin(s: string): { letters: string; tones: string } {
  let letters = "", tones = "";
  for (const ch of s.toLowerCase().normalize("NFC")) {
    if (TONE_MARKS[ch]) {
      letters += TONE_MARKS[ch][0];
      tones += String(TONE_MARKS[ch][1]);
    } else if (/[1-5]/.test(ch)) tones += ch === "5" ? "" : ch;
    else if (ch === "ü") letters += "v";
    else if (/[a-z]/.test(ch)) letters += ch;
  }
  return { letters, tones };
}

export function gradeChinese(hanzi: string, pinyin: string, input: string): SpellResult {
  const typed = input.trim();
  if (!typed) return { score: 0, marks: [], note: "Chưa viết gì." };
  if ([...typed].some(isHan)) {
    const t = [...hanzi].filter(isHan), i = [...typed].filter(isHan);
    const score = i.join("") === t.join("") ? 100 : similarity(i, t);
    const marks = inputMarks(i, t);
    return { score, marks: i.map((ch, k) => ({ ch, ok: marks[k]! })), note: score === 100 ? "Đúng chữ Hán!" : score >= 50 ? "Gần đúng — sai/thiếu chữ." : "Chưa đúng — xem đáp án." };
  }
  const want = splitPinyin(pinyin), got = splitPinyin(typed);
  const lettersScore = got.letters === want.letters ? 100 : similarity([...got.letters], [...want.letters]);
  const marks = [...typed].map((ch) => ({ ch, ok: lettersScore === 100 }));
  if (lettersScore === 100 && got.tones === want.tones) return { score: 100, marks, note: "Đúng pinyin và thanh điệu!" };
  if (lettersScore === 100 && !got.tones) return { score: 80, marks, note: "Đúng pinyin, nhưng chưa ghi thanh điệu (gõ số 1–4 sau mỗi âm, vd. ni3 hao3)." };
  if (lettersScore === 100) return { score: 60, marks, note: "Đúng âm nhưng sai thanh điệu." };
  return {
    score: Math.round(lettersScore * 0.6),
    marks: display(typed, want.letters, (s) => splitPinyin(s).letters),
    note: "Pinyin chưa đúng — xem đáp án.",
  };
}
