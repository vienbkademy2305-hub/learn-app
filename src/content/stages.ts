/**
 * "Chặng" (stages) of the learning map (docs/STAGE_MAP_UI_PLAN.md): groups of consecutive lessons shown as one
 * node on /en and /zh. Pure data + helpers; the lesson data itself is not touched.
 */

export interface StageDef {
  id: string;
  title: string;
  icon: string;
  /** one line under the title in the sheet */
  blurb: string;
  /** first and last lesson number of the stage (inclusive) */
  from: number;
  to: number;
  /** Chinese only: the HSK level the numbers belong to */
  level?: string;
}

export const EN_STAGES: StageDef[] = [
  { id: "en-1", title: "Làm quen", icon: "👋", blurb: "Bản thân, gia đình, nhà cửa, số đếm, trường học, công việc, ăn uống", from: 1, to: 10 },
  { id: "en-2", title: "Đời sống & du lịch", icon: "✈️", blurb: "Mua sắm, thời tiết, sức khỏe, kể chuyện quá khứ, kế hoạch, ôn Giai đoạn 1", from: 11, to: 20 },
  { id: "en-3", title: "Học thuật mở đầu", icon: "📚", blurb: "Giáo dục, môi trường, công nghệ, sức khỏe, pháp luật + chiến thuật 4 kỹ năng", from: 21, to: 30 },
  { id: "en-4", title: "Xã hội & truyền thông", icon: "📰", blurb: "Gia đình, du lịch, đô thị hóa, truyền thông", from: 31, to: 38 },
  { id: "en-5", title: "Kinh tế & tổng ôn", icon: "💼", blurb: "Việc làm, toàn cầu hóa, chính sách công, mini mock Giai đoạn 2", from: 39, to: 45 },
  { id: "en-6", title: "Bứt phá band 6.0", icon: "🚀", blurb: "Writing Task 1 nâng cao, collocation, từ nối, mệnh đề nâng cao", from: 46, to: 55 },
  { id: "en-7", title: "Chạm band 6.5", icon: "🏔️", blurb: "Đảo ngữ, câu điều kiện, sửa lỗi người Việt hay mắc, tổng ôn Giai đoạn 3", from: 56, to: 65 },
  { id: "en-8", title: "Thi thử từng kỹ năng", icon: "📝", blurb: "Mock Listening + Reading, Writing, Speaking", from: 66, to: 74 },
  { id: "en-9", title: "Nước rút", icon: "🏁", blurb: "Luyện theo lỗi, mock đủ 4 kỹ năng, chiến thuật phòng thi", from: 75, to: 80 },
];

export const ZH_STAGES: StageDef[] = [
  { id: "zh-1-1", title: "Chào hỏi & gia đình", icon: "👋", blurb: "Chào hỏi, giới thiệu, gia đình, số đếm, thời gian", from: 1, to: 5, level: "1" },
  { id: "zh-1-2", title: "Sinh hoạt thường ngày", icon: "🏙️", blurb: "Hoạt động, trường học, địa điểm, đi lại, mua sắm", from: 6, to: 10, level: "1" },
  { id: "zh-1-3", title: "Ăn uống & đồ vật", icon: "🍜", blurb: "Ăn uống, thời tiết, đặt câu hỏi, đồ vật", from: 11, to: 14, level: "1" },
  { id: "zh-2-1", title: "Củng cố nền tảng", icon: "🌱", blurb: "Bản thân, gia đình, thời gian, sinh hoạt, trường học", from: 1, to: 8, level: "2" },
  { id: "zh-2-2", title: "Đi lại, mua sắm, sức khỏe", icon: "🛍️", blurb: "Địa điểm, đi lại, mua sắm, ăn uống, thời tiết, cơ thể", from: 9, to: 15, level: "2" },
  { id: "zh-2-3", title: "Giải trí & cảm xúc", icon: "🎭", blurb: "Thể thao, cảm xúc, thiên nhiên, đồ vật, đặt câu hỏi", from: 16, to: 23, level: "2" },
  { id: "zh-3-1", title: "Nhà cửa, ăn mặc", icon: "🏠", blurb: "Con người, gia đình, nhà ở, sinh hoạt, ăn uống, quần áo", from: 1, to: 6, level: "3" },
  { id: "zh-3-2", title: "Vị trí, thời gian, học tập", icon: "🧭", blurb: "Vị trí, địa điểm, thời tiết, học tập, công việc", from: 7, to: 12, level: "3" },
  { id: "zh-3-3", title: "Giải trí & từ chức năng", icon: "✨", blurb: "Du lịch, cảm xúc, 把/被/除了/为了, phó từ thường dùng", from: 13, to: 19, level: "3" },
];

/** Chinese "stage 0": pinyin and tones, before HSK1 lesson 1. */
export const ZH_PINYIN_STAGE = { id: "zh-0", title: "Phát âm & pinyin", icon: "🔤", blurb: "Pinyin, 4 thanh điệu, thanh mẫu, vận mẫu, nét chữ cơ bản" } as const;

export interface Staged<T> {
  def: StageDef;
  lessons: T[];
}

/** Puts each lesson into the stage whose range (and level, if any) contains it. Lessons outside every stage are dropped. */
export function groupIntoStages<T extends { number: number; hskLevel?: string | null }>(defs: StageDef[], lessons: T[]): Staged<T>[] {
  return defs.map((def) => ({
    def,
    lessons: lessons.filter((l) => l.number >= def.from && l.number <= def.to && (!def.level || l.hskLevel === def.level)),
  }));
}

export type ItemState = "done" | "doing" | "todo";

export interface StageSummary {
  done: number;
  total: number;
  percent: number;
  state: ItemState;
  /** index of the first lesson not done yet, or -1 when all are done */
  nextIndex: number;
}

/** Progress of one stage from the state of its lessons. */
export function summariseStage(states: ItemState[]): StageSummary {
  const total = states.length;
  const done = states.filter((s) => s === "done").length;
  const started = states.some((s) => s !== "todo");
  return {
    done,
    total,
    percent: total ? Math.round((done / total) * 100) : 0,
    state: total > 0 && done === total ? "done" : started ? "doing" : "todo",
    nextIndex: states.findIndex((s) => s !== "done"),
  };
}

/** The stage the learner should open next: the first one not finished (that has lessons to track). */
export function currentStageIndex(summaries: StageSummary[]): number {
  return summaries.findIndex((s) => s.total > 0 && s.state !== "done");
}

export type Row<I, T> = { kind: "item"; index: number; item: I } | { kind: "test"; test: T };

/**
 * The stage's lessons with its tests placed right after the lesson they follow (lessons 1–5, test, lessons 6–10, test …).
 * Tests that follow no lesson of the stage (or have no position) go to the end, in their given order.
 */
export function interleave<I extends { number?: number }, T extends { after?: number }>(items: I[], tests: T[]): Row<I, T>[] {
  const rows: Row<I, T>[] = [];
  const used = new Set<T>();
  items.forEach((item, index) => {
    rows.push({ kind: "item", index, item });
    for (const t of tests) {
      if (!used.has(t) && item.number !== undefined && t.after === item.number) {
        used.add(t);
        rows.push({ kind: "test", test: t });
      }
    }
  });
  for (const t of tests) if (!used.has(t)) rows.push({ kind: "test", test: t });
  return rows;
}
