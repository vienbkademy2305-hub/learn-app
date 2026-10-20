import { describe, expect, it } from "vitest";
import { assessSpeech } from "../src/domain/speech-match";
import { browserReport } from "../src/domain/pron-report";
import { EMPTY_PHONES, findMinimalPairs, masteryOf, pairsFor, parsePhones, recordReport, swappedSounds, weakestPhones } from "../src/domain/phone-stats";

const dict = { think: "/θɪŋk/", sink: "/sɪŋk/", ship: "/ʃɪp/", sheep: "/ʃiːp/", sip: "/sɪp/", my: "/maɪ/", name: "/neɪm/", is: "/ɪz/", lan: "/læn/", sit: "/sɪt/", seat: "/siːt/" };

function report(text: string, heard: string) {
  return browserReport(text, assessSpeech(text, heard, "en"), heard, dict);
}

describe("phone statistics", () => {
  it("counts every sound of a word said right, and the sound-by-sound result of a wrong word", () => {
    const stats = recordReport(EMPTY_PHONES, report("think sink", "sink sink"), dict);
    // "think" was heard as "sink": θ wrong, ɪ ŋ k right; "sink" said right: s ɪ ŋ k right
    expect(stats.phones["θ"]).toEqual({ tries: 1, right: 0 });
    expect(stats.phones["ɪ"]).toEqual({ tries: 2, right: 2 });
    expect(stats.phones["s"]).toEqual({ tries: 1, right: 1 });
  });
  it("rates sounds only after a few tries and lists the weakest first", () => {
    let st = EMPTY_PHONES;
    for (let i = 0; i < 3; i++) st = recordReport(st, report("think", "sink"), dict);
    for (let i = 0; i < 3; i++) st = recordReport(st, report("my name", "my name"), dict);
    expect(masteryOf(st.phones["θ"])).toBe("weak");
    expect(masteryOf(st.phones["m"])).toBe("strong");
    expect(masteryOf(st.phones["zzz"])).toBe("new");
    expect(weakestPhones(st)).toEqual(["θ"]);
  });
  it("parses stored statistics defensively", () => {
    expect(parsePhones({ v: 1, phones: { θ: { tries: 4, right: 1 }, bad: { tries: 1, right: 5 } } }).phones).toEqual({ θ: { tries: 4, right: 1 } });
    expect(parsePhones(null)).toBe(EMPTY_PHONES);
  });
});

describe("minimal pairs", () => {
  it("finds words that differ by exactly one sound", () => {
    const pairs = findMinimalPairs(dict);
    const has = (a: string, b: string) => pairs.some((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
    expect(has("think", "sink")).toBe(true);
    expect(has("ship", "sip")).toBe(true);
    expect(has("ship", "sheep")).toBe(true); // ɪ vs iː: the classic pair
    expect(has("think", "my")).toBe(false);
  });
  it("lists pairs for one sound, shortest first", () => {
    const pairs = findMinimalPairs(dict);
    const forTh = pairsFor(pairs, "θ");
    expect(forTh.length).toBeGreaterThan(0);
    expect(forTh.every((p) => p.soundA === "θ" || p.soundB === "θ")).toBe(true);
  });
  it("shows which sounds were swapped", () => {
    expect(swappedSounds("/θɪŋk/", "/sɪŋk/")).toEqual([{ expected: "θ", heard: "s" }]);
  });
});
