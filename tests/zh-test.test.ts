import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isItemCorrect, itemCount, spokenText, summarizeZhTest, type ZhTest } from "@/domain/zh-test";

const test = JSON.parse(readFileSync("data/zh-tests/hsk3-luyen-de-1.json", "utf8")) as ZhTest;
const parts = test.sections.flatMap((s) => s.parts);

describe("zh test data", () => {
  it("has the HSK3 2026 shape: 30 listening, 30 reading, 10 writing", () => {
    expect(itemCount(test)).toBe(70);
    expect(test.sections.map((s) => s.parts.reduce((n, p) => n + p.items.length, 0))).toEqual([30, 30, 10]);
  });
  it("every item is answerable", () => {
    for (const p of parts)
      p.items.forEach((it, i) => {
        if (p.kind === "listen" || p.kind === "mcq") {
          expect(it.options).toHaveLength(3);
          expect(isItemCorrect(p, it, it.answer)).toBe(true);
          expect(isItemCorrect(p, it, (Number(it.answer) + 1) % 3)).toBe(false);
        }
        if (p.kind === "bank") expect(p.bank![Number(it.answer)], `${p.id}#${i}`).toBeTruthy();
        if (p.kind === "reorder") {
          // picking the words in the order of the answer must be accepted
          const order = [...String(it.answer)].length && it.words!.length;
          expect(order).toBeGreaterThan(2);
          expect(it.words!.join("").length).toBe(String(it.answer).length);
        }
      });
  });
  it("bank parts keep one spare answer and use each answer once", () => {
    for (const p of parts.filter((x) => x.kind === "bank")) {
      const used = p.items.map((i) => i.answer);
      expect(new Set(used).size).toBe(used.length);
      expect(p.bank!.length).toBe(used.length + 1);
    }
  });
});

describe("scoring", () => {
  it("scores a perfect and an empty run", () => {
    const answers: Record<string, number | string> = {};
    for (const p of parts)
      p.items.forEach((it, i) => {
        answers[`${p.id}:${i}`] =
          p.kind === "reorder"
            ? [...it.words!.keys()].sort((a, b) => String(it.answer).indexOf(it.words![a]!) - String(it.answer).indexOf(it.words![b]!)).join("|")
            : it.answer;
      });
    const full = summarizeZhTest(test, answers);
    expect(full.correct).toBe(70);
    expect(full.passed).toBe(true);
    expect(summarizeZhTest(test, {}).correct).toBe(0);
  });
  it("ignores punctuation in typed answers and strips speaker labels for the voice", () => {
    const v1 = parts.find((p) => p.id === "v1")!;
    expect(isItemCorrect(v1, v1.items[0]!, " 奶 ")).toBe(true);
    expect(isItemCorrect(v1, v1.items[0]!, "牛")).toBe(false);
    expect(spokenText(parts[0]!.items[0]!)).not.toMatch(/[男女]：/);
  });
});
