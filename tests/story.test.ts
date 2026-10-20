import { describe, expect, it } from "vitest";
import { stories, storiesOf, toPinyin } from "@/content/stories";
import {
  EMPTY_STORIES,
  heardClues,
  judge,
  maxStars,
  nextStep,
  recordAccusation,
  recordInterview,
  setSuspicion,
  readingWpm,
  starsEarned,
  storyStats,
  validateStory,
  type Story,
} from "@/domain/story";

const all = stories();
const sample = all.find((s) => s.id === "a2-lost-tickets")!;

describe("story content", () => {
  it("has playable, valid stories", () => {
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const s of all) expect(validateStory(s)).toEqual([]);
  });
  it("allows a different number of witnesses per story", () => {
    const counts = new Set(all.map((s) => s.witnesses.length));
    expect(counts.size).toBeGreaterThan(1);
    expect(maxStars(all.find((s) => s.witnesses.length === 4)!)).toBe(13);
    expect(maxStars(sample)).toBe(10);
  });
});

describe("validation", () => {
  it("rejects a culprit that is not a witness and evidence that does not exist", () => {
    const bad: Story = { ...sample, solution: { ...sample.solution, culprit: "nobody", evidence: ["x", "garden-empty"] } };
    const errs = validateStory(bad);
    expect(errs.some((e) => e.includes("culprit"))).toBe(true);
    expect(errs.some((e) => e.includes('"x"'))).toBe(true);
  });
  it("rejects a clue that no statement gives", () => {
    const bad: Story = { ...sample, clues: [...sample.clues, { id: "ghost", witness: "jack", text: "x", text_vi: "x" }] };
    expect(validateStory(bad).some((e) => e.includes("never given"))).toBe(true);
  });
});

describe("progress", () => {
  it("keeps the best interview and pays XP once, then half for a better star count", () => {
    const first = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 1, total: 3, seconds: 90 });
    expect(first.xp).toBe(10);
    expect(starsEarned(first.state.stories[sample.id])).toBe(1);
    const worse = recordInterview(first.state, sample.id, "jack", { correct: 0, total: 3, seconds: 50 });
    expect(worse.xp).toBe(0);
    expect(worse.state.stories[sample.id]!.witnesses.jack!.correct).toBe(1);
    const better = recordInterview(worse.state, sample.id, "jack", { correct: 3, total: 3, seconds: 40 });
    expect(better.xp).toBe(5);
    expect(starsEarned(better.state.stories[sample.id])).toBe(3);
  });
  it("walks interview by interview, then to the accusation", () => {
    let st = EMPTY_STORIES;
    expect(nextStep(sample, st.stories[sample.id])).toEqual({ kind: "interview", witness: "jack" });
    for (const w of sample.witnesses) st = recordInterview(st, sample.id, w.id, { correct: 3, total: 3, seconds: 30 }).state;
    expect(nextStep(sample, st.stories[sample.id])).toEqual({ kind: "accuse" });
    expect(heardClues(sample, st.stories[sample.id]).map((c) => c.id)).toContain("lily-kitchen");
  });
  it("remembers the suspicion mark only for interviewed witnesses", () => {
    expect(setSuspicion(EMPTY_STORIES, sample.id, "jack", "innocent")).toBe(EMPTY_STORIES);
    const s1 = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 2, total: 3, seconds: 10 }).state;
    expect(setSuspicion(s1, sample.id, "jack", "innocent").stories[sample.id]!.witnesses.jack!.suspicion).toBe("innocent");
  });
  it("judges accusations: culprit and both pieces of evidence; bonus star only on the first try", () => {
    expect(judge(sample, { culprit: "lily", evidence: ["lily-kitchen", "garden-empty"] }).ok).toBe(true);
    expect(judge(sample, { culprit: "lily", evidence: ["doorbell", "garden-empty"] })).toMatchObject({ culpritOk: true, evidenceOk: false, ok: false });
    expect(judge(sample, { culprit: "jack", evidence: ["lily-kitchen", "garden-empty"] }).ok).toBe(false);

    const wrong = recordAccusation(EMPTY_STORIES, sample, { culprit: "jack", evidence: ["doorbell", "dislikes-band"] });
    expect(wrong.ok).toBe(false);
    const right = recordAccusation(wrong.state, sample, { culprit: "lily", evidence: ["garden-empty", "lily-kitchen"] });
    expect(right).toMatchObject({ ok: true, xp: 20 });
    expect(right.state.stories[sample.id]).toMatchObject({ solved: true, solvedFirstTry: false, accusations: 2 });
    const direct = recordAccusation(EMPTY_STORIES, sample, { culprit: "lily", evidence: ["garden-empty", "lily-kitchen"] });
    expect(direct.state.stories[sample.id]!.solvedFirstTry).toBe(true);
    expect(recordAccusation(direct.state, sample, { culprit: "lily", evidence: ["garden-empty", "lily-kitchen"] }).xp).toBe(0);
  });
});

describe("reading stats", () => {
  it("measures words per minute and ignores meaningless timings", () => {
    expect(readingWpm("one two three four five six seven eight nine ten", 5)).toBe(120);
    expect(readingWpm("too short", 10)).toBeNull();
    expect(readingWpm("one two three four five six seven eight nine ten", 1)).toBeNull();
    expect(readingWpm("one two three four five six seven eight nine ten", 900)).toBeNull();
  });
  it("averages speed and comprehension over the interviews so far", () => {
    expect(storyStats(undefined)).toEqual({ wpm: null, comprehension: null });
    let st = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 3, total: 3, seconds: 30, wpm: 100 }).state;
    st = recordInterview(st, sample.id, "brown", { correct: 1, total: 3, seconds: 30, wpm: 140 }).state;
    expect(storyStats(st.stories[sample.id])).toEqual({ wpm: 120, comprehension: 67 });
  });
});

import { isEmptyStories, mergeStories, sameStories } from "@/domain/story";

describe("merging copies", () => {
  it("keeps the best of both and never loses progress", () => {
    const a = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 1, total: 3, seconds: 20 }).state;
    let b = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 3, total: 3, seconds: 40 }).state;
    b = recordInterview(b, sample.id, "lily", { correct: 2, total: 3, seconds: 40 }).state;
    b = recordAccusation(b, sample, { culprit: "lily", evidence: ["garden-empty", "lily-kitchen"] }).state;
    const m = mergeStories(a, b);
    expect(m.stories[sample.id]!.witnesses.jack!.stars).toBe(3);
    expect(m.stories[sample.id]!.witnesses.lily).toBeDefined();
    expect(m.stories[sample.id]).toMatchObject({ solved: true, solvedFirstTry: true });
    expect(sameStories(mergeStories(m, a), m)).toBe(true);
    expect(sameStories(mergeStories(a, b), mergeStories(b, a))).toBe(true);
    expect(isEmptyStories(mergeStories(EMPTY_STORIES, EMPTY_STORIES))).toBe(true);
  });
  it("keeps a suspicion mark when the better copy has none", () => {
    const a = setSuspicion(recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 1, total: 3, seconds: 20 }).state, sample.id, "jack", "suspect");
    const b = recordInterview(EMPTY_STORIES, sample.id, "jack", { correct: 3, total: 3, seconds: 20 }).state;
    expect(mergeStories(a, b).stories[sample.id]!.witnesses.jack).toMatchObject({ stars: 3, suspicion: "suspect" });
  });
});

describe("Chinese stories", () => {
  const zh = storiesOf("zh");
  it("has stories for each HSK level, all valid, with pinyin made from the characters", () => {
    expect(zh.length).toBeGreaterThanOrEqual(6);
    expect(new Set(zh.map((s) => s.level))).toEqual(new Set(["HSK1", "HSK2", "HSK3"]));
    for (const s of zh) {
      expect(s.lang).toBe("zh");
      expect(s.id.startsWith("zh-")).toBe(true);
      expect(validateStory(s)).toEqual([]);
      for (const w of s.witnesses) {
        expect(w.name_pinyin).toBeTruthy();
        for (const g of w.segments) expect(g.pinyin).toMatch(/\p{L}/u);
      }
      for (const c of s.clues) expect(c.pinyin).toBeTruthy();
      expect(s.solution.confession_pinyin).toBeTruthy();
    }
  });
  it("keeps English and Chinese stories apart and ids unique", () => {
    expect(storiesOf("en").every((s) => s.lang === "en")).toBe(true);
    const ids = stories().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("writes pinyin with tone marks and plain punctuation", () => {
    expect(toPinyin("你好，我是小明。")).toBe("nǐ hǎo, wǒ shì xiǎo míng.");
    expect(toPinyin("他说：“我想吃苹果。”")).toBe("tā shuō: wǒ xiǎng chī píng guǒ.");
  });
});
