import { describe, expect, it } from "vitest";
import { joinSinoViet, lessonCharacters, segmentSentence, splitSenses, wordSlug } from "../src/domain/display";
import {
  EMPTY_PROGRESS,
  lessonPercent,
  lessonStatus,
  markLessonStarted,
  parseProgress,
  setLearned,
  setLessonCompleted,
} from "../src/domain/progress";

describe("joinSinoViet", () => {
  it("joins the primary reading of every character", () => {
    expect(joinSinoViet([{ hanzi: "学", sinoViet: ["học"] }, { hanzi: "习", sinoViet: ["tập"] }])).toBe("học tập");
  });
  it("returns null when any character has no reading", () => {
    expect(joinSinoViet([{ hanzi: "很", sinoViet: [] }, { hanzi: "好", sinoViet: ["hảo"] }])).toBeNull();
    expect(joinSinoViet([])).toBeNull();
  });
});

describe("splitSenses", () => {
  it("puts proper-noun senses last and extracts measure words", () => {
    const r = splitSenses([
      { text: "họ [Bai2]", recordId: "白 白 [Bai2]" },
      { text: "trắng", recordId: "白 白 [bai2]" },
      { text: "LT: 個|个[ge4], 位[wei4]", recordId: "老師 老师 [lao3 shi1]" },
      { text: "trắng", recordId: "白 白 [bai2]" },
    ]);
    expect(r.meanings).toEqual(["trắng", "họ [Bai2]"]);
    expect(r.measureWords).toEqual(["个", "位"]);
  });
});

describe("segmentSentence", () => {
  it("keeps punctuation between tokens", () => {
    expect(segmentSentence("你好，很高兴。", [
      { text: "你好", word: "w1" },
      { text: "很", word: "w2" },
      { text: "高兴", word: "w3" },
    ])).toEqual([
      { text: "你好", word: "w1" },
      { text: "，", word: null },
      { text: "很", word: "w2" },
      { text: "高兴", word: "w3" },
      { text: "。", word: null },
    ]);
  });
  it("skips tokens that are not in the text instead of breaking", () => {
    expect(segmentSentence("好。", [{ text: "坏", word: "x" }, { text: "好", word: "y" }])).toEqual([
      { text: "好", word: "y" },
      { text: "。", word: null },
    ]);
  });
});

describe("lessonCharacters", () => {
  it("lists each character once, in order, with the words using it", () => {
    const c = (hanzi: string) => ({ hanzi, pinyin: null, sinoViet: [], stroke: `strokes/${hanzi}.json` });
    const chars = lessonCharacters([
      { slug: "w-nihao", chars: [c("你"), c("好")] },
      { slug: "w-ni", chars: [c("你")] },
      { slug: "w-hao", chars: [c("好")] },
    ]);
    expect(chars.map((x) => x.hanzi)).toEqual(["你", "好"]);
    expect(chars[0]!.words).toEqual(["w-nihao", "w-ni"]);
  });
});

describe("wordSlug", () => {
  it("is ASCII-only and unique per simplified + pinyin", () => {
    expect(wordSlug("你好", "ni3hao3")).toBe("ni3hao3-4f60-597d");
    expect(wordSlug("地", "de5")).not.toBe(wordSlug("地", "di4"));
    expect(wordSlug("女儿", "nv3er2")).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("progress", () => {
  const words = ["a", "b", "c", "d"];
  it("tracks learned words and percent", () => {
    let s = setLearned(EMPTY_PROGRESS, "a", true);
    s = setLearned(s, "b", true);
    expect(lessonPercent(s, words)).toBe(50);
    s = setLearned(s, "a", false);
    expect(lessonPercent(s, words)).toBe(25);
    expect(EMPTY_PROGRESS.learned).toEqual({});
  });
  it("derives lesson status", () => {
    expect(lessonStatus(EMPTY_PROGRESS, "l1", words)).toBe("not_started");
    const started = markLessonStarted(EMPTY_PROGRESS, "l1");
    expect(lessonStatus(started, "l1", words)).toBe("in_progress");
    expect(lessonStatus(setLearned(EMPTY_PROGRESS, "a", true), "l1", words)).toBe("in_progress");
    const done = setLessonCompleted(started, "l1", true);
    expect(lessonStatus(done, "l1", words)).toBe("completed");
    expect(lessonStatus(setLessonCompleted(done, "l1", false), "l1", words)).toBe("in_progress");
  });
  it("keeps the first start time", () => {
    const s1 = markLessonStarted(EMPTY_PROGRESS, "l1", new Date("2026-01-01"));
    expect(markLessonStarted(s1, "l1", new Date("2026-02-01"))).toBe(s1);
  });
  it("rejects corrupted storage", () => {
    expect(parseProgress(null)).toBe(EMPTY_PROGRESS);
    expect(parseProgress({ v: 2 })).toBe(EMPTY_PROGRESS);
    expect(parseProgress({ v: 1, learned: { a: "x" }, lessons: {} }).learned).toEqual({ a: "x" });
  });
});
