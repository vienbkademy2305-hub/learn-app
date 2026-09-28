import { describe, expect, it } from "vitest";
import {
  buildCharacterWriting,
  buildListening,
  buildSentenceWriting,
  checkPinyin,
  checkReorder,
  keyToMarked,
  seededRng,
  shuffle,
  type ExSentence,
  type ExWord,
} from "../src/domain/exercises";
import { EMPTY_PROGRESS, parseProgress, recordExercise } from "../src/domain/progress";

const word = (simplified: string, pinyin: string, slug = simplified): ExWord => ({
  slug,
  simplified,
  pinyin,
  meaning: `nghĩa ${simplified}`,
  chars: [...simplified].map((hanzi) => ({ hanzi, pinyin: null, stroke: `strokes/${hanzi}.json` })),
});
const WORDS = [word("你", "nǐ"), word("好", "hǎo"), word("老师", "lǎo shī"), word("谢谢", "xiè xie"), word("再见", "zài jiàn"), word("我", "wǒ")];
const sentence = (key: string, tokens: string[], vi: string): ExSentence => ({
  key,
  simplified: tokens.join("") + "。",
  pinyin: null,
  vi,
  audio: { normal: `audio/${key}.mp3`, slow: `audio/${key}_slow.mp3` },
  tokens: tokens.map((text) => ({ text, word: WORDS.find((w) => w.simplified === text)?.slug ?? null })),
});
const SENTENCES = [
  sentence("s1", ["你", "好"], "Xin chào"),
  sentence("s2", ["老师", "好"], "Chào thầy"),
  sentence("s3", ["谢谢", "老师"], "Cảm ơn thầy"),
  sentence("s4", ["我", "谢谢", "你"], "Tôi cảm ơn bạn"),
  sentence("s5", ["老师", "再见"], "Tạm biệt thầy"),
  sentence("s6", ["我", "好"], "Tôi khỏe"),
  sentence("s7", ["我", "谢谢", "老师"], "Tôi cảm ơn thầy"),
];

describe("shuffle / seededRng", () => {
  it("is deterministic for a seed and keeps every item", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(42));
    expect(shuffle([1, 2, 3, 4, 5], seededRng(42))).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildListening", () => {
  const qs = buildListening(SENTENCES, WORDS, seededRng(1), 6);
  it("builds questions with exactly one correct, distinct choice set", () => {
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(new Set(q.choices.map((c) => c.text)).size).toBe(4);
    }
  });
  it("uses the sentence's own translation / text / blanked word as the answer", () => {
    for (const q of qs) {
      const correct = q.choices.find((c) => c.correct)!.text;
      if (q.kind === "listen-meaning") expect(correct).toBe(q.sentence.vi);
      else if (q.kind === "listen-sentence") expect(correct).toBe(q.sentence.simplified);
      else expect(correct).toBe(q.sentence.tokens[q.blank]!.text);
    }
  });
  it("rotates the three listening kinds", () => {
    expect(qs.slice(0, 3).map((q) => q.kind)).toEqual(["listen-meaning", "listen-sentence", "listen-fill"]);
  });
  it("offers other lesson sentences as distractors for 'choose the sentence'", () => {
    const keys = new Set(SENTENCES.map((s) => s.simplified));
    for (const q of qs.filter((q) => q.kind === "listen-sentence")) {
      for (const c of q.choices) expect(keys.has(c.text)).toBe(true);
    }
  });
  it("falls back to another kind when a sentence cannot support the wanted one", () => {
    // No translations and no lesson words → only "choose the sentence" is possible.
    const bare = SENTENCES.map((s) => ({ ...s, vi: null, tokens: s.tokens.map((t) => ({ ...t, word: null })) }));
    const only = buildListening(bare, WORDS, seededRng(2), 5);
    expect(only.length).toBe(5);
    expect(new Set(only.map((q) => q.kind))).toEqual(new Set(["listen-sentence"]));
  });
  it("skips sentences without audio", () => {
    const silent = SENTENCES.map((s) => ({ ...s, audio: {} }));
    expect(buildListening(silent, WORDS, seededRng(3))).toEqual([]);
  });
});

describe("buildSentenceWriting", () => {
  const qs = buildSentenceWriting(SENTENCES, WORDS, seededRng(3), 4);
  it("alternates reorder and pinyin questions", () => {
    expect(qs.map((q) => q.kind)).toEqual(["reorder", "pinyin", "reorder", "pinyin"]);
  });
  it("falls back to pinyin questions when too few sentences can be reordered", () => {
    const few = buildSentenceWriting(SENTENCES.filter((s) => s.key !== "s7"), WORDS, seededRng(3), 4);
    expect(few.map((q) => q.kind)).toEqual(["reorder", "pinyin", "pinyin", "pinyin"]);
  });
  it("shuffles reorder pieces away from the answer", () => {
    for (const q of qs) {
      if (q.kind !== "reorder") continue;
      expect(q.pieces.map((p) => p.text).sort()).toEqual([...q.answer].sort());
      expect(q.pieces.map((p) => p.text).join("")).not.toBe(q.answer.join(""));
    }
  });
});

describe("buildCharacterWriting", () => {
  it("returns distinct characters that have stroke data", () => {
    const qs = buildCharacterWriting([...WORDS, { ...word("好人", "hǎo rén"), chars: [{ hanzi: "人", pinyin: "rén", stroke: null }] }], seededRng(5), 20);
    const hanzi = qs.map((q) => q.hanzi);
    expect(new Set(hanzi).size).toBe(hanzi.length);
    expect(hanzi).not.toContain("人");
  });
});

describe("checkPinyin", () => {
  it("accepts tone marks or tone numbers, with or without spaces", () => {
    expect(checkPinyin("nǐ hǎo", "ni3hao3")).toBe("correct");
    expect(checkPinyin("ni3hao3", "ni3hao3")).toBe("correct");
    expect(checkPinyin("Ni3 hao3", "ni3hao3")).toBe("correct");
    expect(checkPinyin("xie4xie", "xie4xie5")).toBe("correct");
    expect(checkPinyin("nü3er2", "nv3er2")).toBe("correct");
    expect(checkPinyin("nv3er2", "nv3er2")).toBe("correct");
  });
  it("flags right letters with wrong tones", () => {
    expect(checkPinyin("ni hao", "ni3hao3")).toBe("tone");
    expect(checkPinyin("ni2hao3", "ni3hao3")).toBe("tone");
  });
  it("rejects wrong syllables and empty input", () => {
    expect(checkPinyin("wo3", "ni3")).toBe("wrong");
    expect(checkPinyin("   ", "ni3")).toBe("wrong");
  });
  it("renders a key with tone marks", () => {
    expect(keyToMarked("lao3shi1")).toBe("lǎoshī");
  });
});

describe("checkReorder", () => {
  it("compares the assembled text", () => {
    expect(checkReorder(["我", "谢谢", "你"], ["我", "谢谢", "你"])).toBe(true);
    expect(checkReorder(["你", "谢谢", "我"], ["我", "谢谢", "你"])).toBe(false);
  });
});

describe("recordExercise", () => {
  it("keeps the best ratio and the last score, and marks the lesson started", () => {
    let s = recordExercise(EMPTY_PROGRESS, "l1", "listening", 5, 8);
    s = recordExercise(s, "l1", "listening", 3, 8);
    expect(s.exercises!["l1:listening"]).toMatchObject({ best: 5, total: 8, last: 3 });
    s = recordExercise(s, "l1", "listening", 6, 6);
    expect(s.exercises!["l1:listening"]).toMatchObject({ best: 6, total: 6, last: 6 });
    expect(s.lessons.l1?.startedAt).toBeTruthy();
  });
  it("reads progress saved before exercises existed", () => {
    expect(parseProgress({ v: 1, learned: {}, lessons: {} }).exercises).toEqual({});
  });
});
