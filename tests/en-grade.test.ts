import { describe, expect, it } from "vitest";
import { countWords, gradeCorrection, gradeDictation, isCorrect, mcqIndex, normalizeAnswer } from "../src/domain/en-grade";
import { buildEnSnapshot } from "../importers/en/export";

describe("English answer grading", () => {
  it("ignores case, spaces, curly quotes, final punctuation and contractions", () => {
    expect(normalizeAnswer("  Doesn’t   Cook. ")).toBe("does not cook");
    expect(isCorrect("does not cook", "doesn't cook")).toBe(true);
    expect(isCorrect("I'll open", "will open", ["'ll open"])).toBe(false);
    expect(isCorrect("'ll open", "'ll open")).toBe(true);
    expect(isCorrect("will open", "'ll open")).toBe(true);
    expect(isCorrect("There's a big wardrobe in my room", "There is a big wardrobe in my room.")).toBe(true);
  });

  it("is strict on spelling and uses accept lists", () => {
    expect(isCorrect("studys", "studies")).toBe(false);
    expect(isCorrect("traveled", "travelled", ["traveled"])).toBe(true);
    expect(isCorrect("", "is")).toBe(false);
  });

  it("reads MCQ answers as letters or indexes", () => {
    expect(mcqIndex("b")).toBe(1);
    expect(mcqIndex("C")).toBe(2);
    expect(mcqIndex(0)).toBe(0);
  });

  it("grades error correction on the corrected paragraph", () => {
    const errors = [
      { wrong: "more taller", right: "taller" },
      { wrong: "hair black", right: "black hair" },
      { wrong: "In next week", right: "Next week" },
    ];
    const original = "She is more taller than me and she has hair black. In next week we meet.";
    expect(gradeCorrection(original, errors)).toEqual([false, false, false]);
    expect(gradeCorrection("She is taller than me and she has black hair. Next week we meet.", errors)).toEqual([true, true, true]);
    expect(gradeCorrection("She is taller than me and she has hair black. In next week we meet.", errors)).toEqual([true, false, false]);
  });

  it("scores dictation word by word in order", () => {
    const d = gradeDictation("my birthday is on the thirteen of march", "My birthday is on the thirteenth of March.");
    expect(d.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(["thirteenth"]);
    expect(d.score).toBeCloseTo(7 / 8);
  });

  it("counts words", () => {
    expect(countWords("I have two siblings: an elder brother and a younger sister.")).toBe(11);
    expect(countWords("  ")).toBe(0);
  });
});

describe("English snapshot", () => {
  const snap = buildEnSnapshot();

  it("has the 20 lessons of stage 1 with unique word slugs", () => {
    expect(snap.lessons.map((l) => l.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    const slugs = Object.values(snap.words).map((w) => w.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });

  it("every gradable question has an answer the grader can accept", () => {
    for (const l of snap.lessons)
      for (const step of l.steps)
        if (step.type === "exercises")
          for (const ex of step.items)
            for (const q of ex.questions ?? []) {
              if (ex.kind.startsWith("speaking")) continue;
              if (ex.kind === "mcq") expect(mcqIndex(q.answer), `${ex.id} ${q.q}`).toBeLessThan(q.options!.length);
              else expect(isCorrect(String(q.answer), q.answer, q.accept), `${ex.id} ${q.q}`).toBe(true);
            }
  });

  it("error-correction originals fail and their fixes pass", () => {
    for (const l of snap.lessons)
      for (const step of l.steps)
        if (step.type === "exercises")
          for (const ex of step.items.filter((e) => e.kind === "error-correction")) {
            let fixed = ex.text!;
            for (const e of ex.errors!) fixed = fixed.replace(e.wrong, e.right);
            expect(gradeCorrection(ex.text!, ex.errors!).some(Boolean), `${ex.id} original`).toBe(false);
            expect(gradeCorrection(fixed, ex.errors!).every(Boolean), `${ex.id} fixed`).toBe(true);
          }
  });
});
