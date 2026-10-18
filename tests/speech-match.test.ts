import { describe, expect, it } from "vitest";
import { assessSpeech, firstLetterHint, matchSpeech } from "@/domain/speech-match";

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

describe("assessSpeech", () => {
  it("scores like matchSpeech when the engine gives no confidence", () => {
    expect(assessSpeech("Nice to meet you.", "nice to meet you", "en", {}).score).toBe(100);
  });
  it("lowers the score when confidence is low and caps a reading found only in a lower alternative", () => {
    expect(assessSpeech("Nice to meet you.", "nice to meet you", "en", { confidence: 0.4 }).score).toBeLessThan(100);
    expect(assessSpeech("Nice to meet you.", ["nice to eat you", "nice to meet you"], "en", {}).score).toBe(95);
  });
  it("flags slow and fast speech", () => {
    expect(assessSpeech("I live in Hanoi with my family.", "i live in hanoi with my family", "en", { speechMs: 15000 }).pace).toBe("slow");
    expect(assessSpeech("I live in Hanoi with my family.", "i live in hanoi with my family", "en", { speechMs: 1000 }).pace).toBe("fast");
    expect(assessSpeech("I live in Hanoi with my family.", "i live in hanoi with my family", "en", { speechMs: 3500 }).pace).toBe("ok");
  });
});

describe("near misses of the recognizer", () => {
  it("one wrong letter on a long word still counts", () => {
    expect(matchSpeech("I like the restaurant", "I like the restaurent", "en").score).toBe(100);
  });
  it("short words and real different words do not", () => {
    expect(matchSpeech("The cat sat", "The cut sat", "en").score).toBeLessThan(100);
    expect(matchSpeech("I live in Hanoi", "I leave in Hanoi", "en").score).toBeLessThan(100);
    expect(matchSpeech("They are happy", "They are unhappy", "en").score).toBeLessThan(100);
  });
});
