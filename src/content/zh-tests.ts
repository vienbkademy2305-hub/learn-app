/** Server-side loader for the Chinese practice tests (data/zh-tests/*.json), read at build time. */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getLevels, lessonsOfLevel } from "@/content/load";
import { blockPlan, buildZhBlockTest } from "@/domain/zh-test-gen";
import { itemCount, type ZhTest } from "@/domain/zh-test";
import { lessonExerciseData } from "@/features/exercises/data";

const DIR = path.resolve(process.cwd(), "data", "zh-tests");

/** Short tests after every ~5 lessons and an exit test per HSK level, generated from the lessons (src/domain/zh-test-gen.ts). */
function generatedTests(): ZhTest[] {
  const out: ZhTest[] = [];
  for (const level of getLevels()) {
    const lessons = lessonsOfLevel(level).sort((a, b) => a.number - b.number);
    const data = lessons.map((l) => lessonExerciseData(l.slug));
    let mini = 0;
    for (const b of blockPlan(lessons.length)) {
      const slice = data.slice(b.from - 1, b.to);
      const last = lessons[b.to - 1];
      if (!last) continue;
      const id = b.kind === "final" ? `zh-hsk${level}-final` : `zh-hsk${level}-mini-${++mini}`;
      const title = b.kind === "final" ? `Bài đầu ra HSK${level}` : `Kiểm tra ngắn HSK${level} · Bài ${b.from}–${b.to}`;
      const t = buildZhBlockTest({
        id,
        title_vi: title,
        level: Number(level),
        kind: b.kind,
        after: last.number,
        words: slice.flatMap((d) => d.words),
        sentences: slice.flatMap((d) => d.sentences),
      });
      if (t) out.push(t);
    }
  }
  return out;
}

let cache: ZhTest[] | null = null;
export function zhTests(): ZhTest[] {
  cache ??= [
    ...generatedTests(),
    ...readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => ({ kind: "exam" as const, ...(JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as ZhTest) })),
  ];
  return cache;
}
export const zhTest = (id: string) => zhTests().find((t) => t.id === id);
export const zhTestCards = () =>
  zhTests().map((t) => ({ id: t.id, title: t.title_vi, level: t.level, minutes: t.minutes, pass: t.pass_percent, items: itemCount(t), status: t.status, after: t.after_lesson, kind: t.kind ?? "exam" }));
