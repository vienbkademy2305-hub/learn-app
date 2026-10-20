import { describe, expect, it } from "vitest";
import { currentStageIndex, EN_STAGES, groupIntoStages, interleave, summariseStage, ZH_STAGES } from "@/content/stages";
import { enContent } from "@/content/en";
import { content } from "@/content/load";

describe("stage coverage", () => {
  it("puts every English lesson into exactly one stage", () => {
    const lessons = enContent().lessons;
    const grouped = groupIntoStages(EN_STAGES, lessons);
    expect(grouped.reduce((n, g) => n + g.lessons.length, 0)).toBe(lessons.length);
    expect(grouped.every((g) => g.lessons.length > 0)).toBe(true);
  });
  it("puts every Chinese lesson into exactly one stage", () => {
    const lessons = content().lessons;
    const grouped = groupIntoStages(ZH_STAGES, lessons);
    expect(grouped.reduce((n, g) => n + g.lessons.length, 0)).toBe(lessons.length);
    expect(grouped.every((g) => g.lessons.length > 0)).toBe(true);
  });
  it("has unique ids and no overlapping ranges", () => {
    for (const defs of [EN_STAGES, ZH_STAGES]) {
      expect(new Set(defs.map((d) => d.id)).size).toBe(defs.length);
    }
    for (let i = 1; i < EN_STAGES.length; i++) expect(EN_STAGES[i]!.from).toBe(EN_STAGES[i - 1]!.to + 1);
  });
});

describe("stage progress", () => {
  it("summarises done / doing / todo", () => {
    expect(summariseStage(["todo", "todo"])).toMatchObject({ state: "todo", percent: 0, nextIndex: 0 });
    expect(summariseStage(["done", "doing", "todo"])).toMatchObject({ state: "doing", done: 1, percent: 33, nextIndex: 1 });
    expect(summariseStage(["done", "done"])).toMatchObject({ state: "done", percent: 100, nextIndex: -1 });
    expect(summariseStage([])).toMatchObject({ total: 0, state: "todo" });
  });
  it("points at the first unfinished stage", () => {
    const s = [summariseStage(["done"]), summariseStage(["done", "todo"]), summariseStage(["todo"])];
    expect(currentStageIndex(s)).toBe(1);
    expect(currentStageIndex([summariseStage(["done"])])).toBe(-1);
  });
});

describe("tests inside a stage", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ number: i + 1 }));
  it("places each test right after the lesson it follows", () => {
    const rows = interleave(items, [{ id: "a", after: 5 }, { id: "b", after: 10 }, { id: "c", after: 10 }]);
    const order = rows.map((r) => (r.kind === "item" ? String(r.item.number) : (r.test as { id: string }).id));
    expect(order).toEqual(["1", "2", "3", "4", "5", "a", "6", "7", "8", "9", "10", "b", "c"]);
  });
  it("puts tests without a matching lesson at the end", () => {
    const rows = interleave(items.slice(0, 3), [{ id: "x" }, { id: "y", after: 99 }]);
    expect(rows.map((r) => r.kind)).toEqual(["item", "item", "item", "test", "test"]);
  });
  it("gives every English test a lesson of its own stage to follow", () => {
    const lessons = enContent().lessons;
    const cards = [...new Set(enContent().tests.map((t) => t.after_lesson))];
    for (const after of cards) expect(lessons.some((l) => l.number === after)).toBe(true);
  });
});
