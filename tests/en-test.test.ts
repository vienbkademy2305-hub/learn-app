import { describe, expect, it } from "vitest";
import { buildEnSnapshot } from "../importers/en/export";
import { gradeCorrection, isCorrect, mcqIndex } from "../src/domain/en-grade";
import { DICTATION_POINTS, itemLessons, summarizeTest, testExercises, testItemCount, weakLessons } from "../src/domain/en-test";

const snap = buildEnSnapshot();
const byId = (id: string) => snap.tests.find((t) => t.id === id)!;

describe("English stage tests — data", () => {
  it("has 4 mini tests and the exit test for stage 1, pass mark 80%", () => {
    expect(snap.tests.filter((t) => t.stage === 1).map((t) => t.id)).toEqual(["gd1-mini-1", "gd1-mini-2", "gd1-mini-3", "gd1-mini-4", "gd1-final"]);
    for (const t of snap.tests) expect(t.pass_percent).toBe(80);
  });

  it("every stage 2 mini test covers its five lessons, error by error", () => {
    for (const t of snap.tests.filter((x) => x.stage === 2 && x.kind === "mini")) {
      const lessons = new Set(testExercises(t).flatMap(itemLessons));
      const want = [0, 1, 2, 3, 4].map((i) => t.after_lesson - 4 + i);
      expect([...lessons].sort((a, b) => a - b), t.id).toEqual(want);
      for (const ex of testExercises(t).filter((e) => e.kind === "error-correction"))
        expect(itemLessons(ex), ex.id).toEqual(ex.errors!.map((e) => e.lesson ?? ex.lesson));
    }
  });

  it("every stage test has a two-voice listening dialogue and a listening true/false task", async () => {
    const { dialogueTurns } = await import("../src/features/en/speech");
    for (const t of snap.tests) {
      const listening = testExercises(t).filter((ex) => ex.audio_text);
      expect(listening.some((ex) => dialogueTurns(ex.audio_text!)), `${t.id} dialogue`).toBe(true);
      expect(listening.some((ex) => ex.kind === "tf"), `${t.id} true/false`).toBe(true);
    }
  });

  it("every item is tagged with a lesson the test covers", () => {
    for (const t of snap.tests)
      for (const ex of testExercises(t))
        for (const n of itemLessons(ex)) {
          expect(n, `${ex.id}`).toBeGreaterThan(0);
          expect(n, `${ex.id}`).toBeLessThanOrEqual(t.after_lesson);
        }
  });

  it("the key of every question is accepted by the grader", () => {
    for (const t of snap.tests)
      for (const ex of testExercises(t)) {
        for (const q of ex.questions ?? []) {
          if (ex.kind === "mcq") expect(mcqIndex(q.answer), `${ex.id} ${q.q}`).toBeLessThan(q.options!.length);
          else if (!["tfng", "ynng", "tf"].includes(ex.kind)) expect(isCorrect(String(q.answer), q.answer, q.accept), `${ex.id} ${q.q}`).toBe(true);
        }
        if (ex.kind === "error-correction") {
          let fixed = ex.text!;
          for (const e of ex.errors!) fixed = fixed.replace(e.wrong, e.right);
          expect(gradeCorrection(ex.text!, ex.errors!).some(Boolean), `${ex.id} original`).toBe(false);
          expect(gradeCorrection(fixed, ex.errors!).every(Boolean), `${ex.id} fixed`).toBe(true);
        }
      }
  });

  it("the exit test is long enough to cover the whole stage", () => {
    const final = byId("gd1-final");
    expect(testItemCount(final)).toBeGreaterThanOrEqual(50);
    const lessons = new Set(testExercises(final).flatMap(itemLessons));
    for (let n = 1; n <= 19; n++) expect(lessons.has(n), `lesson ${n}`).toBe(true);
  });

  it("stage 2 has 4 mini tests and an exit test that covers Buổi 21–44", () => {
    expect(snap.tests.filter((t) => t.stage === 2).map((t) => t.id)).toEqual(["gd2-mini-1", "gd2-mini-2", "gd2-mini-3", "gd2-mini-4", "gd2-final"]);
    const final = byId("gd2-final");
    expect(testItemCount(final)).toBeGreaterThanOrEqual(50);
    const lessons = new Set(testExercises(final).flatMap(itemLessons));
    for (let n = 21; n <= 44; n++) expect(lessons.has(n), `lesson ${n}`).toBe(true);
  });
});

describe("English stage tests — scoring", () => {
  const t = byId("gd1-mini-2");

  it("all right = 100% and passed; nothing answered = 0% with every lesson weak", () => {
    const all = Object.fromEntries(testExercises(t).map((ex) => [ex.id, itemLessons(ex).map(() => true)]));
    const full = summarizeTest(t, all);
    expect(full.percent).toBe(100);
    expect(full.passed).toBe(true);
    expect(weakLessons(full.byLesson, t.pass_percent)).toEqual([]);

    const none = summarizeTest(t, {});
    expect(none.percent).toBe(0);
    expect(none.passed).toBe(false);
    expect(weakLessons(none.byLesson, t.pass_percent).map((w) => w.lesson).sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10]);
  });

  it("a dictation counts as a fixed number of points", () => {
    const dictation = testExercises(t).find((ex) => ex.kind === "dictation")!;
    expect(itemLessons(dictation)).toHaveLength(DICTATION_POINTS);
  });

  it("80% is the pass line and weak lessons are listed weakest first", () => {
    const total = testItemCount(t);
    const results: Record<string, boolean[]> = {};
    let wrongLeft = Math.floor(total * 0.2); // exactly 80% right (or a bit more)
    for (const ex of testExercises(t)) {
      results[ex.id] = itemLessons(ex).map((lesson) => {
        if (wrongLeft > 0 && lesson === 8) {
          wrongLeft--;
          return false;
        }
        return true;
      });
    }
    const s = summarizeTest(t, results);
    expect(s.percent).toBeGreaterThanOrEqual(80);
    expect(s.passed).toBe(true);
    expect(weakLessons(s.byLesson, 80)[0]?.lesson).toBe(8);
  });
});
