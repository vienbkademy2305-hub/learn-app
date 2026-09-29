/**
 * Pure grading for English exercises (ENGLISH_SPLIT_PLAN E3). Lenient on case, spacing, curly quotes,
 * final punctuation and contractions; strict on spelling and word choice.
 */

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bdon't\b/g, "do not"],
  [/\bdoesn't\b/g, "does not"],
  [/\bdidn't\b/g, "did not"],
  [/\bisn't\b/g, "is not"],
  [/\baren't\b/g, "are not"],
  [/\bwasn't\b/g, "was not"],
  [/\bweren't\b/g, "were not"],
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "cannot"],
  [/\bmustn't\b/g, "must not"],
  [/\bshouldn't\b/g, "should not"],
  [/\bi'm\b/g, "i am"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(he|she|it|there|that|what)'s\b/g, "$1 is"],
  [/\b(i|you|he|she|it|we|they)'ll\b/g, "$1 will"],
  [/(^|\s)'ll\b/g, "$1will"],
  [/(^|\s)'m\b/g, "$1am"],
  [/(^|\s)'re\b/g, "$1are"],
];

export function normalizeAnswer(s: string, keepCase = false): string {
  let t = s.normalize("NFC");
  if (!keepCase) t = t.toLowerCase();
  t = t
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?,;:]+$/g, "")
    .trim();
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  return t;
}

/** Accepted answers of a question: `answer` plus `accept`. MCQ answers are handled by `mcqIndex`. */
export function isCorrect(given: string, answer: string | number | undefined, accept: string[] = []): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  return [answer, ...accept].some((a) => a !== undefined && normalizeAnswer(String(a)) === g);
}

/** MCQ answer as a 0-based index: `b` → 1, `2` → 2. */
export function mcqIndex(answer: string | number | undefined): number {
  if (typeof answer === "number") return answer;
  if (typeof answer === "string" && /^[a-z]$/i.test(answer)) return answer.toLowerCase().charCodeAt(0) - 97;
  return Number(answer);
}

/**
 * Error correction graded on the whole corrected paragraph: an error counts as fixed when its wrong
 * phrase is gone and its right phrase is present.
 */
export function gradeCorrection(corrected: string, errors: Array<{ wrong: string; right: string }>): boolean[] {
  // Loose: ignore case and punctuation. Strict: keep both (spacing around punctuation unified).
  const loose = (s: string) => ` ${normalizeAnswer(s).replace(/[.,!?;:]/g, " ").replace(/\s+/g, " ").trim()} `;
  const strict = (s: string) => ` ${s.normalize("NFC").replace(/[‘’`´]/g, "'").replace(/\s*([.,!?;:])\s*/g, "$1 ").replace(/\s+/g, " ").trim()} `;
  return errors.map((e) => {
    // Capitalisation (i → I) and punctuation errors (comma splice) only show in strict form.
    const norm = loose(e.wrong) === loose(e.right) ? strict : loose;
    const text = norm(corrected);
    const wrong = norm(e.wrong).trimEnd();
    const right = norm(e.right).trimEnd();
    return text.includes(right) && (right.includes(wrong) || !text.includes(wrong));
  });
}

/** Word-by-word dictation check (order-sensitive, LCS): which reference words the learner wrote. */
export function gradeDictation(given: string, reference: string): { words: Array<{ word: string; ok: boolean }>; score: number } {
  const tok = (s: string) => normalizeAnswer(s).replace(/[.,!?;:"]/g, " ").split(/\s+/).filter(Boolean);
  const refDisplay = reference.split(/\s+/).filter(Boolean);
  const ref = tok(reference);
  const got = tok(given);
  const dp = Array.from({ length: ref.length + 1 }, () => new Array<number>(got.length + 1).fill(0));
  for (let i = ref.length - 1; i >= 0; i--)
    for (let j = got.length - 1; j >= 0; j--)
      dp[i]![j] = ref[i] === got[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const ok = new Array<boolean>(ref.length).fill(false);
  for (let i = 0, j = 0; i < ref.length && j < got.length; ) {
    if (ref[i] === got[j]) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  // tok() may split contractions differently from the display words; fall back to position when lengths differ.
  const words = refDisplay.length === ref.length ? refDisplay.map((w, i) => ({ word: w, ok: ok[i]! })) : ref.map((w, i) => ({ word: w, ok: ok[i]! }));
  return { words, score: ref.length ? ok.filter(Boolean).length / ref.length : 0 };
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}
