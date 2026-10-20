import { describe, expect, it } from "vitest";
import { seededRng } from "../src/domain/exercises";
import {
  applyAnswer,
  clozeParts,
  dayStreak,
  distractors,
  type GameProgress,
  type GameWord,
  isHard,
  isPassed,
  isReviewDue,
  kindsFor,
  nextQueue,
  PASS_BOX,
  planSession,
  scrambleOf,
  summary,
} from "../src/domain/word-game";

const now = new Date("2026-09-30T10:00:00Z");
const empty: GameProgress = { mastery: {}, cards: {}, days: [] };
const w = (id: string, lesson = 1, pos = "n"): GameWord => ({ id, term: id, reading: null, meaning: `nghĩa ${id}`, definitionEn: null, lesson, pos });

const answerN = (gp: GameProgress, id: string, pattern: boolean[]) => pattern.reduce((g, c) => applyAnswer(g, id, c, now), gp);

describe("word game — levels and PASS", () => {
  it("needs two correct answers in a row at each of the three levels", () => {
    let gp = answerN(empty, "a", [true, false, true]);
    expect(gp.mastery.a!.level).toBe(0);
    gp = answerN(gp, "a", [true]);
    expect(gp.mastery.a!.level).toBe(1);
    gp = answerN(gp, "a", [true, true, true]);
    expect(gp.mastery.a!.level).toBe(2);
    expect(isPassed(gp.mastery.a)).toBe(false);
    gp = answerN(gp, "a", [true]);
    expect(isPassed(gp.mastery.a)).toBe(true);
    expect(gp.mastery.a!.passedAt).toBe(now.toISOString());
  });

  it("puts a passed word in Leitner box 3, due three days later", () => {
    const gp = answerN(empty, "a", Array(6).fill(true));
    expect(gp.cards.a!.box).toBe(PASS_BOX);
    expect(gp.cards.a!.due).toBe(new Date(now.getTime() + 3 * 86_400_000).toISOString());
    expect(isReviewDue(gp, "a", now)).toBe(false);
    expect(isReviewDue(gp, "a", new Date(now.getTime() + 3 * 86_400_000))).toBe(true);
  });

  it("review: right moves the card up, wrong sends it to box 1 and back to recall", () => {
    const passed = answerN(empty, "a", Array(6).fill(true));
    const up = applyAnswer(passed, "a", true, now);
    expect(up.cards.a!.box).toBe(4);
    expect(isPassed(up.mastery.a)).toBe(true);
    const down = applyAnswer(passed, "a", false, now);
    expect(down.cards.a!.box).toBe(1);
    expect(down.mastery.a!.level).toBe(2);
    expect(down.mastery.a!.passedAt).toBeUndefined();
  });

  it("marks words wrong three times as hard until they are passed", () => {
    const gp = answerN(empty, "a", [false, false, false]);
    expect(isHard(gp.mastery.a)).toBe(true);
    expect(isHard(answerN(gp, "a", Array(6).fill(true)).mastery.a)).toBe(false);
  });
});

describe("word game — session", () => {
  it("plans due reviews, started words and at most N new words", () => {
    const words = ["a", "b", "c", "d", "e"].map((id) => w(id));
    let gp = answerN(empty, "a", Array(6).fill(true)); // passed, not due yet
    gp = applyAnswer(gp, "b", true, now); // started
    const plan = planSession(words, gp, { newCount: 2, now });
    expect(plan.review).toEqual([]);
    expect(plan.learn).toEqual(["b", "c", "d"]);
    const later = planSession(words, gp, { newCount: 2, now: new Date(now.getTime() + 4 * 86_400_000) });
    expect(later.review).toEqual(["a"]);
  });

  it("brings a wrong word back after three others, sends right ones to the back, drops passed words", () => {
    const q = ["a", "b", "c", "d", "e", "f"];
    const wrong = applyAnswer(empty, "a", false, now);
    expect(nextQueue(q, wrong, false, false)).toEqual(["b", "c", "d", "a", "e", "f"]);
    const passed = answerN(empty, "a", Array(6).fill(true));
    expect(nextQueue(q, passed, false, true)).toEqual(["b", "c", "d", "e", "f"]);
    expect(nextQueue(q, passed, true, true)).toEqual(["b", "c", "d", "e", "f"]);
    const right = applyAnswer(empty, "a", true, now);
    expect(nextQueue(q, right, false, true)).toEqual(["b", "c", "d", "e", "f", "a"]);
    // a word wrong three times this session goes to the back instead of blocking the others
    expect(nextQueue(q, wrong, false, false, 3)).toEqual(["b", "c", "d", "e", "f", "a"]);
  });

  it("chooses the game by level and falls back when there is no voice or definition", () => {
    const word = w("a");
    expect(kindsFor(0, "en", word, true)).toEqual(["choose-term", "choose-meaning", "true-false"]);
    expect(kindsFor(1, "zh", word, false)).toEqual(["choose-term"]);
    // "a" has fewer than 4 letters: no scramble
    expect(kindsFor(2, "en", word, true)).toEqual(["listen-type", "type-term"]);
    expect(kindsFor(2, "zh", { ...word, definitionEn: "to eat" }, true)).toEqual(["definition"]);
  });

  it("adds the sentence and spelling games when the word allows them", () => {
    const word: GameWord = { ...w("a"), term: "address", example: { text: "What is your address?", vi: "Địa chỉ của bạn là gì?" } };
    expect(kindsFor(0, "en", word, true)).toContain("cloze");
    expect(kindsFor(1, "en", word, true)).toEqual(["listen-choose", "cloze"]);
    expect(kindsFor(2, "en", word, true)).toEqual(["listen-type", "type-term", "scramble", "cloze-type"]);
    expect(kindsFor(2, "zh", { ...word, term: "地址", example: { text: "你的地址是什么？", vi: null } }, true)).toEqual(["choose-term", "cloze"]);
  });

  it("splits an example sentence around the term, whole words only", () => {
    const word: GameWord = { ...w("a"), term: "cat", example: { text: "The Cat sat on the mat. Concatenate.", vi: null } };
    expect(clozeParts(word, "en")).toEqual({ before: "The ", match: "Cat", after: " sat on the mat. Concatenate." });
    expect(clozeParts({ ...word, example: { text: "Concatenate it.", vi: null } }, "en")).toBeNull();
    expect(clozeParts({ ...word, example: undefined }, "en")).toBeNull();
    expect(clozeParts({ ...word, term: "你好", example: { text: "他说：你好！", vi: null } }, "zh")).toEqual({ before: "他说：", match: "你好", after: "！" });
  });

  it("scrambles single words into a different order", () => {
    const out = scrambleOf("address", seededRng(3))!;
    expect(out.slice().sort().join("")).toBe([..."address"].sort().join(""));
    expect(out.join("")).not.toBe("address");
    expect(scrambleOf("ice cream", seededRng(1))).toBeNull();
    expect(scrambleOf("cat", seededRng(1))).toBeNull();
    expect(scrambleOf("aaaa", seededRng(1))).toBeNull();
  });

  it("picks distinct wrong options, same lesson first", () => {
    const pool = [w("a", 1), w("b", 1), w("c", 1), w("d", 5), w("e", 9), { ...w("f", 1), meaning: "nghĩa a" }];
    const opts = distractors(pool[0]!, pool, 3, seededRng(1));
    expect(opts.map((o) => o.id)).not.toContain("a");
    expect(opts.map((o) => o.id)).not.toContain("f");
    expect(opts.slice(0, 2).every((o) => o.lesson === 1)).toBe(true);
  });

  it("counts study days in a row and the summary", () => {
    expect(dayStreak(["2026-09-28", "2026-09-29", "2026-09-30"], now)).toBe(3);
    expect(dayStreak(["2026-09-28", "2026-09-29"], now)).toBe(2);
    expect(dayStreak(["2026-09-27"], now)).toBe(0);
    const gp = answerN(answerN(empty, "a", Array(6).fill(true)), "b", [false, false, false]);
    expect(summary([w("a"), w("b"), w("c")], gp)).toEqual({ passed: 1, learning: 1, hard: 1, fresh: 1, total: 3 });
  });
});

describe("blitz and boss helpers", () => {
  const mk = (id: string): import("@/domain/word-game").GameWord => ({ id, term: id, reading: null, meaning: `m-${id}`, definitionEn: null, lesson: 1 });
  const empty = { mastery: {}, cards: {}, days: [] };
  it("combo multiplier grows every 3 and stops at x5", async () => {
    const { blitzMultiplier, blitzPoints } = await import("@/domain/word-game");
    expect([0, 2, 3, 6, 11, 12, 40].map(blitzMultiplier)).toEqual([1, 1, 2, 3, 4, 5, 5]);
    expect(blitzPoints(3)).toBe(20);
  });
  it("never repeats the last word and favours hard words", async () => {
    const { blitzPick } = await import("@/domain/word-game");
    const words = ["a", "b", "c"].map(mk);
    const gp = { ...empty, mastery: { a: { level: 0, streak: 0, wrong: 5, at: "" } } };
    for (let i = 0; i < 30; i++) expect(blitzPick(words, gp, Math.random, "a").id).not.toBe("a");
    let hard = 0;
    for (let i = 0; i < 600; i++) if (blitzPick(words, gp, Math.random).id === "a") hard++;
    expect(hard).toBeGreaterThan(200); // weight 5 of 5+3+3
    expect(blitzPick([mk("only")], empty, Math.random, "only").id).toBe("only");
  });
  it("blitz xp is capped, boss hp is a share of the queue", async () => {
    const { blitzXp, bossHp } = await import("@/domain/word-game");
    expect([0, 5, 30].map(blitzXp)).toEqual([0, 10, 40]);
    expect(bossHp(3, 6)).toBe(0.5);
    expect(bossHp(0, 0)).toBe(0);
  });
});

describe("pickHuntTargets", () => {
  const mk = (id: string, lesson = 1): import("@/domain/word-game").GameWord => ({ id, term: id, reading: null, meaning: id, definitionEn: null, lesson });
  it("hard words first, then learning words, passed words never, no repeats", async () => {
    const { pickHuntTargets } = await import("@/domain/word-game");
    const words = ["a", "b", "c", "d", "e", "f", "g"].map((id) => mk(id));
    const mastery = {
      a: { level: 0, streak: 0, wrong: 3, at: "" },
      b: { level: 1, streak: 0, wrong: 6, at: "" },
      c: { level: 3, streak: 0, wrong: 9, at: "", passedAt: "x" },
      d: { level: 1, streak: 0, wrong: 1, at: "" },
    };
    const t = pickHuntTargets(words, mastery, seededRng(1), 5).map((w) => w.id);
    expect(t.slice(0, 3)).toEqual(["b", "a", "d"]);
    expect(t).not.toContain("c");
    expect(new Set(t).size).toBe(t.length);
    expect(t).toHaveLength(5);
  });
  it("skips excluded ids and stays within reached lessons", async () => {
    const { pickHuntTargets } = await import("@/domain/word-game");
    const words = [mk("x", 1), mk("y", 2), mk("z", 40)];
    const t = pickHuntTargets(words, {}, seededRng(2), 5, ["x"]).map((w) => w.id);
    expect(t).toEqual(["y"]);
  });
});
