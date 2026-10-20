/**
 * Chinese block tests built from the lessons themselves (docs/STAGE_MAP_UI_PLAN.md): after every ~5 lessons a short test
 * (listen → meaning, word → meaning, meaning → hanzi, reorder a sentence, write a word) and an exit test per HSK level.
 * Deterministic: the same lessons always give the same test. Pure.
 */
import { seededRng, shuffle, type ExSentence, type ExWord, type Rng } from "./exercises";
import type { ZhTest, ZhTestItem, ZhTestPart } from "./zh-test";

export interface BlockInput {
  id: string;
  title_vi: string;
  level: number;
  kind: "mini" | "final";
  /** lesson number (within the level) the test follows */
  after: number;
  words: ExWord[];
  sentences: ExSentence[];
}

const SIZE = {
  mini: { listen: 5, meaning: 5, hanzi: 4, reorder: 3, type: 3, minutes: 15 },
  final: { listen: 8, meaning: 7, hanzi: 6, reorder: 5, type: 4, minutes: 25 },
} as const;

const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);

const unique = <T>(items: T[], key: (t: T) => string) => [...new Map(items.map((i) => [key(i), i])).values()];

/** 4 options: the right one plus 3 different wrong ones; null when there are not enough distinct wrong answers. */
function options(right: string, wrong: string[], rng: Rng): { options: string[]; answer: number } | null {
  const others = shuffle([...new Set(wrong.filter((w) => w && w !== right))], rng).slice(0, 3);
  if (others.length < 3) return null;
  const all = shuffle([right, ...others], rng);
  return { options: all, answer: all.indexOf(right) };
}

export function buildZhBlockTest(input: BlockInput): ZhTest | null {
  const rng = seededRng(seedOf(input.id));
  const size = SIZE[input.kind];
  const words = unique(input.words.filter((w) => w.meaning), (w) => w.slug);
  const sentences = unique(input.sentences, (s) => s.key);
  const meanings = words.map((w) => w.meaning!);

  const listen: ZhTestItem[] = [];
  const viPool = sentences.map((s) => s.vi ?? "");
  for (const s of shuffle(sentences.filter((x) => x.vi), rng)) {
    if (listen.length >= size.listen) break;
    const o = options(s.vi!, viPool, rng);
    if (o) listen.push({ q: "Câu này nghĩa là gì?", audio: s.simplified, ...o });
  }

  const meaning: ZhTestItem[] = [];
  for (const w of shuffle(words, rng)) {
    if (meaning.length >= size.meaning) break;
    const o = options(w.meaning!, meanings, rng);
    if (o) meaning.push({ q: `“${w.simplified}” (${w.pinyin}) nghĩa là gì?`, ...o });
  }

  const hanzi: ZhTestItem[] = [];
  const terms = words.map((w) => w.simplified);
  for (const w of shuffle(words, rng)) {
    if (hanzi.length >= size.hanzi) break;
    const o = options(w.simplified, terms, rng);
    if (o) hanzi.push({ q: `Chọn chữ Hán có nghĩa “${w.meaning}”.`, ...o });
  }

  const reorder: ZhTestItem[] = [];
  for (const s of shuffle(sentences, rng)) {
    if (reorder.length >= size.reorder) break;
    const pieces = s.tokens.map((t) => t.text).filter((t) => /\p{Script=Han}/u.test(t));
    if (pieces.length < 3 || pieces.length > 8) continue;
    let order = shuffle(pieces, rng);
    if (order.join("") === pieces.join("")) order = [...pieces].reverse();
    reorder.push({ q: s.vi ? `Sắp xếp thành câu: ${s.vi}` : "Sắp xếp thành câu.", words: order, answer: s.simplified });
  }

  const type: ZhTestItem[] = [];
  for (const w of shuffle(words.filter((x) => [...x.simplified].length <= 3), rng)) {
    if (type.length >= size.type) break;
    type.push({ q: `Viết chữ Hán: “${w.meaning}”`, hint: w.pinyin, answer: w.simplified });
  }

  const part = (id: string, kind: ZhTestPart["kind"], title_vi: string, instructions_vi: string, items: ZhTestItem[]): ZhTestPart | null =>
    items.length ? { id, kind, title_vi, instructions_vi, items } : null;
  const sections = [
    { id: "nghe", title_vi: "Nghe", parts: [part("nghe", "listen", "Nghe và chọn nghĩa", "Bấm Nghe (nghe được nhiều lần), rồi chọn nghĩa đúng.", listen)] },
    {
      id: "doc",
      title_vi: "Đọc",
      parts: [
        part("nghia", "mcq", "Từ nào, nghĩa gì?", "Chọn nghĩa đúng của từ.", meaning),
        part("chu", "mcq", "Chọn chữ Hán", "Chọn chữ Hán đúng với nghĩa.", hanzi),
      ],
    },
    {
      id: "viet",
      title_vi: "Viết",
      parts: [
        part("sapxep", "reorder", "Sắp xếp câu", "Bấm các từ theo đúng thứ tự để thành câu.", reorder),
        part("viet", "type", "Viết chữ Hán", "Gõ chữ Hán (có gợi ý pinyin).", type),
      ],
    },
  ]
    .map((s) => ({ ...s, parts: s.parts.filter((p): p is ZhTestPart => p !== null) }))
    .filter((s) => s.parts.length > 0);

  const total = sections.reduce((n, s) => n + s.parts.reduce((m, p) => m + p.items.length, 0), 0);
  if (total < 8) return null;
  return {
    id: input.id,
    title_vi: input.title_vi,
    level: input.level,
    minutes: size.minutes,
    pass_percent: 70,
    status: "draft",
    intro_vi:
      input.kind === "final"
        ? `Bài đầu ra HSK${input.level}: ôn lại từ và câu của cả cấp. Làm một lần, nộp bài rồi xem điểm từng phần.`
        : `Kiểm tra ngắn sau bài ${input.after}: từ vựng và câu của các bài vừa học. Câu hỏi được lấy từ chính nội dung bài.`,
    after_lesson: input.after,
    kind: input.kind,
    sections,
  };
}

/** Where the tests of a level go: a short one after lessons 5, 10, 15, 20 … and the exit test after the last lesson. */
export function blockPlan(lessonCount: number): Array<{ kind: "mini" | "final"; from: number; to: number }> {
  const plan: Array<{ kind: "mini" | "final"; from: number; to: number }> = [];
  let from = 1;
  for (let to = 5; to < lessonCount; to += 5) {
    plan.push({ kind: "mini", from, to });
    from = to + 1;
  }
  plan.push({ kind: "final", from: 1, to: lessonCount });
  return plan;
}
