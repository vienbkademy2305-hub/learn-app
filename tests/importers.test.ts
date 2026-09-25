import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readSentenceCourses, readVocabulary } from "../importers/adapters/hsk1-chinese-learning";
import { parseCvdictLine } from "../importers/adapters/xue-hanzi";
import { matchByPinyin, type WordCandidate } from "../importers/build/match";
import { buildGraph, type PipelineInputs } from "../importers/build/pipeline";

describe("parseCvdictLine", () => {
  it("parses a CEDICT-format line", () => {
    expect(parseCvdictLine("學習 学习 [xue2 xi2] /học/tìm hiểu/")).toEqual({
      traditional: "學習",
      simplified: "学习",
      pinyinNumbered: "xue2 xi2",
      senses: ["học", "tìm hiểu"],
      recordId: "學習 学习 [xue2 xi2]",
    });
  });
  it("rejects malformed lines", () => {
    expect(parseCvdictLine("not a dictionary line")).toBeNull();
  });
});

describe("matchByPinyin", () => {
  const cands: WordCandidate[] = [
    { key: "地|de5", numbered: "de5", inCurriculum: true },
    { key: "地|di4", numbered: "di4", inCurriculum: true },
  ];
  it("picks the reading whose tone-marked pinyin matches", () => {
    expect(matchByPinyin("dì", cands)).toEqual({ status: "matched", key: "地|di4" });
  });
  it("falls back to toneless matching for tone sandhi", () => {
    expect(matchByPinyin("bú", [{ key: "不|bu4", numbered: "bu4", inCurriculum: true }])).toEqual({ status: "matched_toneless", key: "不|bu4" });
  });
  it("prefers the lowercase reading over a proper noun", () => {
    const r = matchByPinyin("bái", [
      { key: "白|bai2", numbered: "Bai2", inCurriculum: false },
      { key: "白|bai2b", numbered: "bai2", inCurriculum: false },
    ]);
    expect(r).toEqual({ status: "matched", key: "白|bai2b" });
  });
  it("reports unresolved tokens instead of guessing", () => {
    expect(matchByPinyin("qǐng zuò", [])).toMatchObject({ status: "unresolved", reason: "no_candidates" });
  });
});

describe("hsk1-chinese-learning adapter", () => {
  it("evaluates the browser data scripts and drops personal names", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "hsk1cl-"));
    const vocab = path.join(dir, "vocabulary.js");
    writeFileSync(vocab, `const HSK1_VOCABULARY = [{ hanzi: "爱", pinyin: "ài", vietnamese: "yêu" }, { hanzi: "庞立亮", pinyin: "x", vietnamese: "y" }];`);
    const sentences = path.join(dir, "sentences.js");
    writeFileSync(sentences, `const HSK1_SENTENCE_COURSES = [{ courseId: "c1", courseTitle: "T", sentences: [{ hanzi: "你好！", pinyin: "nǐ hǎo", translation: "Xin chào" }] }];`);
    const { words, excluded } = readVocabulary(vocab);
    expect(words.map((w) => w.hanzi)).toEqual(["爱"]);
    expect(excluded.map((w) => w.hanzi)).toEqual(["庞立亮"]);
    expect(readSentenceCourses(sentences)[0]).toMatchObject({ hanzi: "你好！", recordId: "c1#0" });
  });
});

describe("buildGraph (fixture)", () => {
  const audioDir = mkdtempSync(path.join(tmpdir(), "audio-"));
  for (const f of ["a1.mp3", "a1_slow.mp3"]) writeFileSync(path.join(audioDir, f), "x");

  const inputs: PipelineInputs = {
    cvdict: [
      { traditional: "你好", simplified: "你好", pinyinNumbered: "ni3 hao3", senses: ["xin chào"], recordId: "你好 你好 [ni3 hao3]" },
      { traditional: "地", simplified: "地", pinyinNumbered: "de5", senses: ["(trợ từ)"], recordId: "地 地 [de5]" },
      { traditional: "地", simplified: "地", pinyinNumbered: "di4", senses: ["đất"], recordId: "地 地 [di4]" },
      { traditional: "臺", simplified: "台", pinyinNumbered: "tai2", senses: ["đài"], recordId: "臺 台 [tai2]" },
      { traditional: "檯", simplified: "台", pinyinNumbered: "tai2", senses: ["bàn"], recordId: "檯 台 [tai2]" },
    ],
    sinoViet: { 你: ["nhĩ"], 好: ["hảo"], 地: ["địa"] },
    sinoVietOverrides: {},
    makemeahanzi: new Map(),
    hskLists: [[
      { simplified: "你好", radical: "亻", frequency: 1, pos: [], forms: [{ traditional: "你好", transcriptions: { pinyin: "nǐ hǎo", numeric: "ni3 hao3" }, meanings: [] }] },
      { simplified: "地", radical: "土", frequency: 1, pos: [], forms: [
        { traditional: "地", transcriptions: { pinyin: "de", numeric: "de5" }, meanings: [] },
        { traditional: "地", transcriptions: { pinyin: "dì", numeric: "di4" }, meanings: [] },
      ] },
      { simplified: "台", radical: "口", frequency: 1, pos: [], forms: [
        { traditional: "臺", transcriptions: { pinyin: "tái", numeric: "tai2" }, meanings: [] },
        { traditional: "檯", transcriptions: { pinyin: "tái", numeric: "tai2" }, meanings: [] },
      ] },
    ]],
    hskSentences: [
      {
        id: "hsk1-0001", hsk_level: 1, topic: "greetings", sentence_type: "statement",
        chinese: "你好！", traditional: "你好！", pinyin: "nǐ hǎo!", pinyin_numbered: "ni3 hao3!",
        translation: { en: "Hello!" }, tokens: [{ word: "你好", pinyin: "nǐ hǎo" }], grammar_points: [], grammar_tags: [],
        audio: { normal: "a1.mp3", slow: "a1_slow.mp3" },
        audio_meta: { engine: "e", voice: "v", license: "Apache-2.0", sample_rate: 24000 },
      },
    ],
    grammarPoints: [],
    reviewFlags: [],
    audioBaseDir: audioDir,
    hsk1Words: [{ hanzi: "你好", pinyin: "nǐhǎo", vietnamese: "Xin chào", index: 0 }],
    hsk1Sentences: [{ hanzi: "你好。", pinyin: "Nǐ hǎo.", translation: "Xin chào.", courseId: "c1", courseTitle: "T", recordId: "c1#0" }],
  };
  const { graph: g, stats } = buildGraph(inputs, 1);

  it("maps the same word from three sources to one row", () => {
    const hello = g.wordsBySimplified("你好");
    expect(hello).toHaveLength(1);
    const sources = [...g.entitySources.values()].filter((s) => s.entityType === "word" && s.entityId === hello[0]!.id).map((s) => s.sourceId);
    expect(new Set(sources)).toEqual(new Set(["cvdict", "complete-hsk-vocabulary", "hsk1-chinese-learning"]));
  });
  it("merges CVDICT lines and HSK forms that share simplified + pinyin", () => {
    expect(g.wordsBySimplified("台")).toHaveLength(1);
    expect(g.wordSenses.filter((s) => s.wordId === g.wordsBySimplified("台")[0]!.id).map((s) => s.text)).toEqual(["đài", "bàn"]);
  });
  it("keeps every reading of an ambiguous HSK item and queues it for review", () => {
    expect(g.wordsBySimplified("地")).toHaveLength(2);
    expect(stats.hsk_readings_ambiguous).toBe(1);
  });
  it("merges a sentence that differs only in punctuation", () => {
    expect(g.sentences.size).toBe(1);
    const s = [...g.sentences.values()][0]!;
    expect(g.translations.filter((t) => t.sentenceId === s.id).map((t) => t.lang).sort()).toEqual(["en", "vi"]);
  });
  it("links characters to words and derives their HSK level", () => {
    const ni = g.characters.get("你")!;
    expect(g.wordCharacters.some((wc) => wc.characterId === ni.id)).toBe(true);
    expect(g.hskLevel("character", ni.id)).toBe("1");
    expect(g.characterSinoViet.find((v) => v.characterId === ni.id)?.reading).toBe("nhĩ");
  });
  it("registers normal and slow audio for the sentence", () => {
    expect(g.audio.map((a) => a.speed).sort()).toEqual(["normal", "slow"]);
  });
});
