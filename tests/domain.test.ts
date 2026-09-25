import { describe, expect, it } from "vitest";
import {
  numberedToMarked,
  pinyinCompare,
  pinyinKey,
  pinyinToneless,
  syllableToMarked,
} from "../src/domain/pinyin";
import { codepointId, hanChars, sentenceContent, sentenceHash } from "../src/domain/text";

describe("pinyinKey", () => {
  it("lowercases, joins syllables and keeps tone numbers", () => {
    expect(pinyinKey("ni3 hao3")).toBe("ni3hao3");
    expect(pinyinKey("Bei3 jing1")).toBe("bei3jing1");
  });
  it("treats a syllable without a number as neutral tone", () => {
    expect(pinyinKey("ba4 ba")).toBe(pinyinKey("ba4 ba5"));
  });
  it("normalizes ü spellings", () => {
    expect(pinyinKey("nu:3 er2")).toBe("nv3er2");
    expect(pinyinKey("nü3 er2")).toBe("nv3er2");
  });
});

describe("numberedToMarked", () => {
  it("places the mark on a/e first, then o in ou, then the last vowel", () => {
    expect(syllableToMarked("hao3")).toBe("hǎo");
    expect(syllableToMarked("xue2")).toBe("xué");
    expect(syllableToMarked("dou1")).toBe("dōu");
    expect(syllableToMarked("gui4")).toBe("guì");
    expect(syllableToMarked("liu2")).toBe("liú");
  });
  it("handles ü, neutral tone, capitals and syllabic consonants", () => {
    expect(syllableToMarked("lv4")).toBe("lǜ");
    expect(syllableToMarked("nu:3")).toBe("nǚ");
    expect(syllableToMarked("ma5")).toBe("ma");
    expect(syllableToMarked("Bei3")).toBe("Běi");
    expect(syllableToMarked("r5")).toBe("r");
  });
  it("converts a whole phrase", () => {
    expect(numberedToMarked("ni3 hao3")).toBe("nǐ hǎo");
  });
});

describe("pinyinCompare / pinyinToneless", () => {
  it("ignores spacing, case and the U+200B separator used by xue-hanzi", () => {
    expect(pinyinCompare("xué​xí")).toBe(pinyinCompare("Xué xí"));
    expect(pinyinCompare(numberedToMarked("xue2 xi2"))).toBe(pinyinCompare("xuéxí"));
  });
  it("matches tone-sandhi variants only without tones", () => {
    expect(pinyinCompare("bú kèqi")).not.toBe(pinyinCompare(numberedToMarked("bu4 ke4 qi5")));
    expect(pinyinToneless("bú kèqi")).toBe(pinyinToneless(numberedToMarked("bu4 ke4 qi5")));
  });
  it("keeps ü distinct from u", () => {
    expect(pinyinToneless("lǜ")).not.toBe(pinyinToneless("lù"));
  });
});

describe("text", () => {
  it("detects the same sentence regardless of punctuation and spaces", () => {
    expect(sentenceContent("你好， 很高兴认识你。")).toBe("你好很高兴认识你");
    expect(sentenceHash("这条路不通。")).toBe(sentenceHash("这条路不通!"));
    expect(sentenceHash("这条路不通。")).not.toBe(sentenceHash("这条路很通。"));
  });
  it("extracts unique Han characters in order", () => {
    expect(hanChars("你好，你们！abc")).toEqual(["你", "好", "们"]);
  });
  it("formats codepoints like Unihan", () => {
    expect(codepointId("你")).toBe("U+4F60");
  });
});
