/**
 * Chinese practice tests (data/zh-tests/*.json, HSK-style): item types and scoring.
 * Answers: listen/mcq/bank → option index; type → the missing characters; reorder → the whole sentence.
 */
export type ZhPartKind = "listen" | "mcq" | "bank" | "type" | "reorder";

export interface ZhTestItem {
  /** question (mcq/bank/type) or the spoken question (listen) */
  q?: string;
  /** read aloud by the browser voice (listen); speaker labels "男：/女：" are stripped */
  audio?: string;
  /** text shown above the question (mcq reading passages) */
  passage?: string;
  options?: string[];
  /** pinyin hint (type) */
  hint?: string;
  /** shuffled pieces (reorder) */
  words?: string[];
  answer: number | string;
  /** other accepted sentences (reorder) */
  accept?: string[];
}
export interface ZhTestPart {
  id: string;
  kind: ZhPartKind;
  title_vi: string;
  instructions_vi: string;
  /** shared answer list A–F (bank) */
  bank?: string[];
  items: ZhTestItem[];
}
export interface ZhTest {
  id: string;
  title_vi: string;
  level: number;
  minutes: number;
  pass_percent: number;
  status: string;
  intro_vi: string;
  /** generated block tests: the lesson (number within the level) the test follows, and its kind */
  after_lesson?: number;
  kind?: "mini" | "final" | "exam";
  sections: Array<{ id: string; title_vi: string; parts: ZhTestPart[] }>;
}

export type ZhAnswer = number | string | undefined;
export const answerKey = (partId: string, index: number) => `${partId}:${index}`;

/** Punctuation and spaces do not count when comparing written Chinese. */
export const normZh = (s: string) => s.replace(/[\s，。？！、；：,.?!;:“”"'‘’（）()]/g, "");

export function isItemCorrect(part: ZhTestPart, item: ZhTestItem, given: ZhAnswer): boolean {
  if (given === undefined || given === "") return false;
  if (part.kind === "type" || part.kind === "reorder") {
    // reorder answers are stored as the picked word indexes "2|0|1"
    const text = part.kind === "reorder" ? String(given).split("|").map((i) => item.words?.[Number(i)] ?? "").join("") : String(given);
    const g = normZh(text);
    return [item.answer, ...(item.accept ?? [])].some((a) => normZh(String(a)) === g);
  }
  return given === item.answer;
}

export const itemCount = (t: ZhTest) => t.sections.reduce((n, s) => n + s.parts.reduce((m, p) => m + p.items.length, 0), 0);

export interface ZhTestSummary {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  bySection: Array<{ id: string; title_vi: string; correct: number; total: number }>;
  /** per part → per item */
  marks: Record<string, boolean[]>;
}

export function summarizeZhTest(t: ZhTest, answers: Record<string, ZhAnswer>): ZhTestSummary {
  const marks: Record<string, boolean[]> = {};
  const bySection = t.sections.map((s) => {
    let correct = 0;
    let total = 0;
    for (const p of s.parts) {
      marks[p.id] = p.items.map((it, i) => isItemCorrect(p, it, answers[answerKey(p.id, i)]));
      correct += marks[p.id]!.filter(Boolean).length;
      total += p.items.length;
    }
    return { id: s.id, title_vi: s.title_vi, correct, total };
  });
  const correct = bySection.reduce((n, s) => n + s.correct, 0);
  const total = bySection.reduce((n, s) => n + s.total, 0);
  const percent = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= t.pass_percent, bySection, marks };
}

/** What the voice reads: the dialogue without "男：" / "女：" labels. */
export const spokenText = (item: ZhTestItem) =>
  [item.audio?.replace(/(^|\n)[男女]：/g, "$1").replace(/\n/g, "。 "), item.q].filter(Boolean).join(" ");
