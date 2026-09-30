import { describe, expect, it } from "vitest";
import { seededRng, type ExWord } from "../src/domain/exercises";
import { buildVocabRecall, RECALL_MODES, checkOwnSentence, checkParagraph, paragraphTask } from "../src/domain/practice";
import { EMPTY_PROGRESS, isDue, noteKey, parseProgress, reviewCard, saveNote, toggleSaved } from "../src/domain/progress";

const word = (simplified: string, pinyin: string, meaning: string | null = `nghĩa ${simplified}`): ExWord => ({
  slug: `w-${simplified}`,
  simplified,
  pinyin,
  meaning,
  chars: [...simplified].map((hanzi) => ({ hanzi, pinyin: null, stroke: null })),
});
const WORDS = [word("你", "nǐ"), word("好", "hǎo"), word("老师", "lǎo shī"), word("谢谢", "xiè xie"), word("再见", "zài jiàn"), word("我", "wǒ"), word("的", "de", null)];

describe("buildVocabRecall", () => {
  it("rotates the kinds with one correct choice among 4 distinct options", () => {
    const qs = buildVocabRecall(WORDS, seededRng(1), 6);
    expect(qs).toHaveLength(6);
    expect(qs.map((q) => q.kind)).toEqual([...RECALL_MODES.mixed]);
    for (const q of qs) {
      if (q.kind === "meaning-type") continue;
      expect(q.choices).toHaveLength(4);
      expect(q.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(new Set(q.choices.map((c) => c.text)).size).toBe(4);
      const right = q.choices.find((c) => c.correct)!.text;
      expect(right).toBe(q.kind === "hanzi-meaning" || q.kind === "listen-meaning" ? q.word.meaning : q.word.simplified);
    }
  });

  it("repeats words for long rounds, never the same word twice in a row", () => {
    const qs = buildVocabRecall(WORDS, seededRng(4), 30, RECALL_MODES["vi-zh"]);
    expect(qs).toHaveLength(30);
    expect(new Set(qs.map((q) => q.kind))).toEqual(new Set(["meaning-hanzi", "meaning-type"]));
    for (let i = 1; i < qs.length; i++) expect(qs[i]!.word).not.toBe(qs[i - 1]!.word);
  });

  it("drops listening questions when the device cannot speak Chinese", () => {
    expect(buildVocabRecall(WORDS, seededRng(5), 12, RECALL_MODES.mixed, false).some((q) => q.kind.startsWith("listen"))).toBe(false);
    expect(buildVocabRecall(WORDS, seededRng(5), 12, RECALL_MODES.listening, false)).toEqual([]);
  });

  it("skips words without a meaning and returns nothing when the lesson is too small", () => {
    expect(buildVocabRecall(WORDS, seededRng(2), 20).some((q) => q.word.simplified === "的")).toBe(false);
    expect(buildVocabRecall(WORDS.slice(0, 3), seededRng(3))).toEqual([]);
  });
});

describe("checkOwnSentence", () => {
  const known = new Set([..."我你好老师谢再见是"]);
  it("checks target word, length, punctuation and unknown characters", () => {
    expect(checkOwnSentence("我是老师。", "老师", known)).toEqual({ hanCount: 4, usesTarget: true, unknown: [], endsWithPunctuation: true });
    const r = checkOwnSentence(" 他好 ", "老师", known);
    expect(r).toMatchObject({ hanCount: 2, usesTarget: false, unknown: ["他"], endsWithPunctuation: false });
  });
});

describe("checkParagraph", () => {
  const words = [
    { slug: "nihao", simplified: "你好" },
    { slug: "ni", simplified: "你" },
    { slug: "hao", simplified: "好" },
    { slug: "laoshi", simplified: "老师" },
  ];
  it("matches longer words first and counts sentences", () => {
    const r = checkParagraph("你好！我是老师。", words, new Set([..."你好我是老师"]));
    expect(r.usedWords.sort()).toEqual(["laoshi", "nihao"]);
    expect(r.sentenceCount).toBe(2);
    expect(r.hanCount).toBe(6);
    expect(r.unknown).toEqual([]);
  });

  it("gives every lesson a task, falling back to the title", () => {
    expect(paragraphTask({ slug: "hsk1-03-family", title: "Gia đình" }, 20).prompt).toMatch(/gia đình/);
    expect(paragraphTask({ slug: "hsk2-01-x", title: "Du lịch" }, 3)).toMatchObject({ prompt: expect.stringContaining("Du lịch"), minWords: 3 });
  });
});

describe("notebook, flashcards and notes in progress state", () => {
  const now = new Date("2026-09-28T00:00:00Z");

  it("saves and unsaves words", () => {
    const s = toggleSaved(EMPTY_PROGRESS, "w1", true, now);
    expect(s.saved).toEqual({ w1: now.toISOString() });
    expect(toggleSaved(s, "w1", false).saved).toEqual({});
  });

  it("moves cards through Leitner boxes", () => {
    let s = reviewCard(EMPTY_PROGRESS, "w1", true, now);
    expect(s.cards!.w1).toMatchObject({ box: 2, reviews: 1, due: "2026-09-29T00:00:00.000Z" });
    expect(isDue(s, "w1", now)).toBe(false);
    expect(isDue(s, "w1", new Date("2026-09-29T00:00:00Z"))).toBe(true);
    s = reviewCard(s, "w1", true, now);
    expect(s.cards!.w1!.box).toBe(3);
    s = reviewCard(s, "w1", false, now);
    expect(s.cards!.w1).toMatchObject({ box: 1, reviews: 3, due: now.toISOString() });
    expect(isDue(EMPTY_PROGRESS, "never-seen", now)).toBe(true);
  });

  it("stores notes and deletes blank ones", () => {
    const key = noteKey.sentence("l1", "w1");
    const s = saveNote(EMPTY_PROGRESS, key, "我是老师。", now);
    expect(s.notes![key]!.text).toBe("我是老师。");
    expect(saveNote(s, key, "  ").notes).toEqual({});
  });

  it("round-trips through parseProgress and accepts older state", () => {
    const s = saveNote(reviewCard(toggleSaved(EMPTY_PROGRESS, "w1", true, now), "w1", true, now), noteKey.paragraph("l1"), "你好。", now);
    expect(parseProgress(JSON.parse(JSON.stringify(s)))).toEqual({ ...s, exercises: {}, listening: {}, speaking: {}, mastery: {}, gameDays: [] });
    expect(parseProgress({ v: 1, learned: {}, lessons: {} })).toMatchObject({ saved: {}, cards: {}, notes: {} });
  });
});
