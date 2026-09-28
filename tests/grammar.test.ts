import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { grammarFile, readGrammar } from "../importers/editorial/grammar-vi";
import { buildGrammarQuiz, structureParts } from "../src/domain/grammar";
import { seededRng } from "../src/domain/exercises";

const snapshot = {
  lessons: [{ slug: "l1" }, { slug: "l2" }] as never,
  sentences: { s1: {}, s2: {} } as never,
};

describe("readGrammar", () => {
  it("parses points and applies the default status", () => {
    const points = readGrammar(
      `default_status: draft
points:
  - { id: a, lesson: l1, title: T, explain: " E ", examples: [s1], mistakes: [{ wrong: 我是很好。, right: 我很好。, why: W }] }
  - { id: b, lesson: l2, status: reviewed, title: T2, explain: E2 }`,
      snapshot,
    );
    expect(points.map((p) => [p.id, p.draft, p.explain])).toEqual([
      ["a", true, "E"],
      ["b", false, "E2"],
    ]);
    expect(points[1]).toMatchObject({ structures: [], notes: [], mistakes: [], examples: [] });
  });

  it("reports unknown lessons, sentences, duplicate ids and bad mistake pairs together", () => {
    const bad = `points:
  - { id: a, lesson: nope, title: T, explain: E, examples: [s9] }
  - { id: a, lesson: l1, title: T, explain: E, mistakes: [{ wrong: 好, right: 好, why: x }] }`;
    expect(() => readGrammar(bad, snapshot)).toThrow(/4 problem\(s\)[\s\S]*unknown lesson nope[\s\S]*unknown sentence s9[\s\S]*duplicate[\s\S]*bad mistake pair/);
  });

  it("the HSK1 file is valid against the exported snapshot", () => {
    const snap = JSON.parse(readFileSync(path.join(process.cwd(), ".data", "content", "hsk1.json"), "utf8"));
    const points = readGrammar(readFileSync(grammarFile("1"), "utf8"), snap);
    expect(points.length).toBeGreaterThanOrEqual(40);
    for (const lesson of snap.lessons) expect(points.some((p) => p.lesson === lesson.slug)).toBe(true);
    for (const p of points) expect(p.examples.length).toBeGreaterThan(0);
  });
});

describe("grammar quiz and structures", () => {
  it("asks one question per mistake with exactly one correct sentence", () => {
    const qs = buildGrammarQuiz(
      [
        { title: "A", mistakes: [{ wrong: "w1", right: "r1", why: "x" }, { wrong: "w2", right: "r2", why: "y" }] },
        { title: "B", mistakes: [] },
      ],
      seededRng(1),
    );
    expect(qs).toHaveLength(2);
    for (const q of qs) {
      expect(q.choices).toHaveLength(2);
      expect(q.choices.find((c) => c.correct)!.text).toMatch(/^r/);
    }
  });

  it("splits a formula and marks Chinese parts", () => {
    expect(structureParts("Chủ ngữ + 很 + Tính từ")).toEqual([
      { text: "Chủ ngữ", han: false },
      { text: "很", han: true },
      { text: "Tính từ", han: false },
    ]);
  });
});
