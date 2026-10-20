import { describe, expect, it } from "vitest";
import { alignPhones, alignWords, browserReport, ipaPhones, labelOf, levelOf, serverReport, tipFor, weakWords, wordTip } from "../src/domain/pron-report";
import { assessSpeech } from "../src/domain/speech-match";

const dict = { think: "/θɪŋk/", sink: "/sɪŋk/", ship: "/ʃɪp/", sheep: "/ʃiːp/", my: "/maɪ/", name: "/neɪm/", is: "/ɪz/", lan: "/læn/" };

describe("IPA helpers", () => {
  it("splits an IPA string into sounds, keeping affricates, diphthongs and long vowels whole", () => {
    expect(ipaPhones("/θɪŋk/")).toEqual(["θ", "ɪ", "ŋ", "k"]);
    expect(ipaPhones("/ˈtʃɪl.drən/")).toEqual(["tʃ", "ɪ", "l", "d", "r", "ə", "n"]);
    expect(ipaPhones("/ʃiːp/")).toEqual(["ʃ", "iː", "p"]);
    expect(ipaPhones("/maɪ/")).toEqual(["m", "aɪ"]);
  });
  it("aligns expected and heard sounds", () => {
    const a = alignPhones(ipaPhones("/θɪŋk/"), ipaPhones("/sɪŋk/"));
    expect(a.map((p) => p.ok)).toEqual([false, true, true, true]);
    expect(a[0]).toMatchObject({ expected: "θ", heard: "s" });
    const dropped = alignPhones(["h", "æ", "t"], ["h", "æ"]);
    expect(dropped[2]).toMatchObject({ expected: "t", heard: null, ok: false });
  });
  it("gives Vietnamese tips for the sounds learners confuse", () => {
    expect(tipFor("θ", "s")).toContain("giữa hai hàm răng");
    expect(tipFor("θ", null)).toContain("Bạn bỏ mất");
    expect(tipFor("ɑ", "a")).toBe("");
    expect(wordTip(alignPhones(["h", "æ", "t"], ["h", "æ"]))).toContain("/t/");
  });
});

describe("levels", () => {
  it("colours by percent", () => {
    expect(levelOf(90)).toBe("good");
    expect(levelOf(70)).toBe("ok");
    expect(levelOf(40)).toBe("bad");
    expect(labelOf(95)).toBe("Xuất sắc");
    expect(labelOf(20)).toBe("Cần luyện");
  });
});

describe("browser report", () => {
  it("marks words said right, wrong and missed, with the sounds that differ", () => {
    const text = "I think my name is Lan";
    const heard = "i sink my name is";
    const a = assessSpeech(text, heard, "en");
    const r = browserReport(text, a, heard, dict);
    expect(r.words.map((w) => w.status)).toEqual(["good", "bad", "good", "good", "good", "missed"]);
    const think = r.words[1]!;
    expect(think.heard).toBe("sink");
    expect(think.phones!.filter((p) => !p.ok).map((p) => p.expected)).toEqual(["θ"]);
    expect(think.tip).toContain("giữa hai hàm răng");
    expect(think.percent).toBeLessThan(80);
    expect(r.words[5]!.percent).toBe(0);
    expect(weakWords(r).map((w) => w.word)).toEqual(["Lan", "think"]);
    expect(r.overall).toBe(a.score);
  });
  it("is all green for a perfect reading and uses the engine confidence", () => {
    const text = "My name is Lan";
    const a = assessSpeech(text, "my name is lan", "en", { confidence: 0.9 });
    const r = browserReport(text, a, "my name is lan", dict);
    expect(r.words.every((w) => w.status === "good")).toBe(true);
    expect(r.words[0]!.percent).toBe(98);
  });
  it("falls back to a spelling tip when a word is not in the dictionary", () => {
    const text = "the restaurant";
    const a = assessSpeech(text, "the rest tour", "en");
    const r = browserReport(text, a, "the rest tour", {});
    const w = r.words[1]!;
    expect(w.status).toBe("bad");
    expect(w.tip).toContain("Máy nghe thành");
  });
  it("pairs substituted words inside the gaps between matched ones", () => {
    expect(alignWords(["a", "dog", "runs"], ["a", "log", "runs"]).map((x) => x.heard)).toEqual(["a", "log", "runs"]);
    expect(alignWords(["one", "two"], ["one"]).map((x) => x.heard)).toEqual(["one", null]);
  });
});

describe("server report", () => {
  it("turns per-sound confidences into word and sound percentages", () => {
    const r = serverReport("I think so", {
      score: 82,
      transcribe: "I sink so",
      differences: {
        words_with_errors: ["think"],
        errors: [{ position: 1, word: "think", expected: "θɪŋk", actual: "sɪŋk", confidence: 0.4, phones: [{ expected: "θ", heard: "s", confidence: 0.3 }, { expected: "ɪ", heard: "ɪ", confidence: 0.9 }, { expected: "ŋ", heard: "ŋ", confidence: 0.9 }, { expected: "k", heard: "k", confidence: 0.95 }] }],
      },
    });
    expect(r.words.map((w) => w.status)).toEqual(["good", "ok", "good"]);
    expect(r.words[1]).toMatchObject({ percent: 75, ipa: "/θɪŋk/" });
    expect(r.words[1]!.phones![0]).toMatchObject({ ok: false, percent: 30 });
    expect(r.overall).toBe(82);
  });
});
