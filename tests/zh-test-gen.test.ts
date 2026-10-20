import { describe, expect, it } from "vitest";
import { zhTestCards, zhTests } from "../src/content/zh-tests";
import { blockPlan } from "../src/domain/zh-test-gen";
import { itemCount, normZh, summarizeZhTest, type ZhTest } from "../src/domain/zh-test";

const generated = () => zhTests().filter((t) => t.kind === "mini" || t.kind === "final");

/** An order of the shuffled pieces that spells the answer (backtracking; pieces are at most 8), or null. */
function solve(words: string[], answer: string): number[] | null {
  const target = normZh(answer);
  const go = (used: number[], text: string): number[] | null => {
    if (used.length === words.length) return text === target ? used : null;
    for (let i = 0; i < words.length; i++) {
      if (used.includes(i)) continue;
      const next = text + normZh(words[i]!);
      if (!target.startsWith(next)) continue;
      const r = go([...used, i], next);
      if (r) return r;
    }
    return null;
  };
  return go([], "");
}

describe("block plan", () => {
  it("puts a short test after every 5 lessons and the exit test at the end", () => {
    expect(blockPlan(14)).toEqual([
      { kind: "mini", from: 1, to: 5 },
      { kind: "mini", from: 6, to: 10 },
      { kind: "final", from: 1, to: 14 },
    ]);
    expect(blockPlan(23).filter((b) => b.kind === "mini").map((b) => b.to)).toEqual([5, 10, 15, 20]);
    expect(blockPlan(5)).toEqual([{ kind: "final", from: 1, to: 5 }]);
  });
});

describe("generated Chinese tests", () => {
  it("exist for every HSK level, one exit test each", () => {
    const finals = generated().filter((t) => t.kind === "final");
    expect(finals.map((t) => t.level).sort()).toEqual([1, 2, 3]);
    expect(generated().filter((t) => t.kind === "mini").length).toBeGreaterThanOrEqual(8);
  });
  it("are deterministic", () => {
    const a = JSON.stringify(generated());
    expect(a.length).toBeGreaterThan(1000);
    expect(JSON.stringify(generated())).toBe(a);
  });
  it("have well-formed, answerable items", () => {
    for (const t of generated()) {
      expect(itemCount(t)).toBeGreaterThanOrEqual(8);
      for (const s of t.sections)
        for (const p of s.parts)
          for (const it of p.items) {
            if (p.kind === "listen" || p.kind === "mcq") {
              expect(it.options).toHaveLength(4);
              expect(new Set(it.options).size).toBe(4);
              expect(typeof it.answer).toBe("number");
              expect(it.options![it.answer as number]).toBeTruthy();
            }
            if (p.kind === "reorder") expect(solve(it.words!, String(it.answer))).not.toBeNull();
            if (p.kind === "type") expect(String(it.answer).length).toBeGreaterThan(0);
          }
    }
  });
  it("can be scored: perfect answers pass, empty answers fail", () => {
    const t: ZhTest = generated().find((x) => x.kind === "mini")!;
    const perfect: Record<string, number | string> = {};
    for (const s of t.sections)
      for (const p of s.parts)
        p.items.forEach((it, i) => {
          perfect[`${p.id}:${i}`] = p.kind === "reorder" ? solve(it.words!, String(it.answer))!.join("|") : (it.answer as number | string);
        });
    expect(summarizeZhTest(t, {}).percent).toBe(0);
    expect(summarizeZhTest(t, perfect).percent).toBe(100);
  });
  it("show up in the test cards with their position", () => {
    const minis = zhTestCards().filter((c) => c.kind === "mini");
    expect(minis.every((c) => typeof c.after === "number")).toBe(true);
    expect(zhTestCards().some((c) => c.kind === "exam")).toBe(true);
  });
});
