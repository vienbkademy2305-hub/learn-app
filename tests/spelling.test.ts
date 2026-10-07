import { describe, expect, it } from "vitest";
import { gradeChinese, gradeEnglish, splitPinyin } from "@/domain/spelling";

describe("gradeEnglish", () => {
  it("exact (case, spaces, final dot ignored)", () => {
    expect(gradeEnglish("date of birth", " Date of  birth. ").score).toBe(100);
  });
  it("one letter wrong is close", () => {
    const r = gradeEnglish("hometown", "hometwon");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThan(100);
  });
  it("empty is 0", () => expect(gradeEnglish("hello", "  ").score).toBe(0));
});

describe("splitPinyin", () => {
  it("reads marks and numbers alike", () => {
    expect(splitPinyin("nǐ hǎo")).toEqual({ letters: "nihao", tones: "33" });
    expect(splitPinyin("ni3hao3")).toEqual({ letters: "nihao", tones: "33" });
    expect(splitPinyin("lǜ")).toEqual({ letters: "lv", tones: "4" });
  });
});

describe("gradeChinese", () => {
  it("characters", () => {
    expect(gradeChinese("你好", "nǐ hǎo", "你好").score).toBe(100);
    expect(gradeChinese("老师", "lǎo shī", "老").score).toBe(50);
  });
  it("pinyin with tones, without tones, wrong tones", () => {
    expect(gradeChinese("你好", "nǐ hǎo", "ni3 hao3").score).toBe(100);
    expect(gradeChinese("你好", "nǐ hǎo", "nihao").score).toBe(80);
    expect(gradeChinese("你好", "nǐ hǎo", "ni2 hao3").score).toBe(60);
    expect(gradeChinese("你好", "nǐ hǎo", "mihao").score).toBeLessThan(60);
  });
});

describe("gradeEnglish answer marks", () => {
  it("highlights the letters the learner left out", () => {
    const r = gradeEnglish("full name", "ful name");
    expect(r.answer!.filter((m) => !m.ok).map((m) => m.ch)).toEqual(["l"]);
  });
});
