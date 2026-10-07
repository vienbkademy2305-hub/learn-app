import { describe, expect, it } from "vitest";
import { firstLetterHint, matchSpeech } from "@/domain/speech-match";

describe("matchSpeech", () => {
  it("English: full match despite case, punctuation, digits and contractions", () => {
    expect(matchSpeech("My name is Lan and I am twenty-six years old.", "my name is lan and i'm 26 years old", "en").score).toBe(100);
  });
  it("English: marks the missing words", () => {
    const r = matchSpeech("I live in Hanoi with my family.", "i live in hanoi with family", "en");
    expect(r.score).toBe(86);
    expect(r.parts.filter((p) => p.token && !p.ok).map((p) => p.text)).toEqual(["my"]);
  });
  it("takes the best recognizer alternative", () => {
    expect(matchSpeech("Nice to meet you.", ["nice to eat you", "nice to meet you"], "en").score).toBe(100);
  });
  it("Chinese: compares characters and reads digits", () => {
    expect(matchSpeech("我今年二十六岁。", "我今年26岁", "zh").score).toBe(100);
    const r = matchSpeech("老师，您好！", "老师你好", "zh");
    expect(r.score).toBe(75);
    expect(r.parts.filter((p) => p.token && !p.ok).map((p) => p.text)).toEqual(["您"]);
  });
  it("nothing heard scores 0", () => {
    expect(matchSpeech("Hello.", "", "en").score).toBe(0);
  });
});

describe("firstLetterHint", () => {
  it("keeps first letters and punctuation", () => {
    expect(firstLetterHint("My name's Lan.")).toBe("M_ n_____ L__.");
  });
});
