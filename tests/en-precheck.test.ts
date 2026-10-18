import { describe, expect, it } from "vitest";
import { precheck, worthGrading } from "@/domain/en-precheck";
import { lengthCap, normaliseResult, type GradeInput } from "../supabase/functions/grade-writing/grader";

const ids = (t: string, w?: { min: number; max: number }) => precheck(t, w).map((i) => i.id);

describe("precheck", () => {
  it("flags the learner's known slips", () => {
    const r = ids("my name is Lan. i am a student, i like english.");
    expect(r).toContain("capital-i");
    expect(r).toContain("capital-start");
    expect(r).toContain("comma-splice");
  });
  it("checks length against the target and blocks Vietnamese", () => {
    expect(precheck("I like tea.", { min: 60, max: 80 }).find((i) => i.id === "length")?.level).toBe("bad");
    const vi = precheck("Tôi tên là Lan và tôi là sinh viên.");
    expect(worthGrading(vi, 9).ok).toBe(false);
    expect(worthGrading([], 3).ok).toBe(false);
    expect(worthGrading([], 30).ok).toBe(true);
  });
  it("is quiet on a clean text", () => {
    const r = precheck("I live in Hanoi. It is a big city. I like it because it is friendly.", { min: 10, max: 30 });
    expect(r.every((i) => i.level === "ok")).toBe(true);
  });
});

describe("length caps and fabricated errors", () => {
  const t2: GradeInput = { kind: "task2", lesson: { number: 70, title: "t", grammar: null }, prompt_vi: "x", words: { min: 250, max: 300 }, text: "word ".repeat(100) };
  it("caps the task criterion by length", () => {
    expect(lengthCap(t2, 100).task).toBe(3.5);
    expect(lengthCap(t2, 180).task).toBe(4.5);
    expect(lengthCap(t2, 240).task).toBe(5);
    expect(lengthCap(t2, 260).task).toBe(9);
  });
  it("applies the cap and drops errors quoting text that is not in the essay", () => {
    const raw = {
      criteria: ["TR", "CC", "LR", "GRA"].map((code) => ({ code, band: 7, comment_vi: "x" })),
      errors: [
        { wrong: "word word", right: "words", why_vi: "a", type: "grammar", personal: "none", lesson: 0 },
        { wrong: "never written", right: "something", why_vi: "b", type: "grammar", personal: "none", lesson: 0 },
      ],
      corrected: "ok",
    };
    const res = normaliseResult(raw, t2);
    expect(res.criteria.find((c) => c.code === "TR")!.band).toBe(3.5);
    expect(res.criteria.find((c) => c.code === "CC")!.band).toBe(7);
    expect(res.errors).toHaveLength(1);
  });
});
