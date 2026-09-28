import { describe, expect, it } from "vitest";
import { LISTEN_MODES, parseListenMode, playbackFor, SLOW_RATE } from "../src/domain/listening";
import { EMPTY_PROGRESS, listeningSummary, parseProgress, recordListen, recordListenAnswer } from "../src/domain/progress";

describe("listening modes", () => {
  it("has the four modes of the plan", () => {
    expect(LISTEN_MODES.map((m) => m.id)).toEqual(["all", "hanzi", "pinyin", "meaning"]);
  });
  it("falls back to showing everything for unknown stored values", () => {
    expect(parseListenMode("pinyin")).toBe("pinyin");
    expect(parseListenMode("nonsense")).toBe("all");
    expect(parseListenMode(null)).toBe("all");
  });
});

describe("listening progress", () => {
  it("counts plays and answers per sentence", () => {
    let s = recordListen(EMPTY_PROGRESS, "hsk1-0001");
    s = recordListen(s, "hsk1-0001");
    s = recordListenAnswer(s, "hsk1-0001", false);
    s = recordListenAnswer(s, "hsk1-0001", true);
    expect(s.listening!["hsk1-0001"]).toMatchObject({ plays: 2, attempts: 2, correct: 1, lastCorrect: true });
    expect(EMPTY_PROGRESS.listening).toBeUndefined();
  });
  it("answering without playing does not count the sentence as listened", () => {
    const s = recordListenAnswer(EMPTY_PROGRESS, "hsk1-0002", true);
    expect(listeningSummary(s, ["hsk1-0002"])).toEqual({ listened: 0, total: 1, attempts: 1, correct: 1 });
  });
  it("summarises a lesson", () => {
    let s = recordListen(EMPTY_PROGRESS, "a");
    s = recordListen(s, "b");
    s = recordListenAnswer(s, "b", true);
    s = recordListenAnswer(s, "c", false);
    expect(listeningSummary(s, ["a", "b", "c", "d"])).toEqual({ listened: 2, total: 4, attempts: 2, correct: 1 });
  });
  it("survives a storage round trip and old states without listening data", () => {
    const s = recordListen(EMPTY_PROGRESS, "a");
    expect(parseProgress(JSON.parse(JSON.stringify(s))).listening!.a!.plays).toBe(1);
    expect(parseProgress({ v: 1, learned: {}, lessons: {} }).listening).toEqual({});
  });
});

describe("playbackFor", () => {
  const audio = { normal: "n.mp3", slow: "s.mp3" };
  it("uses the recorded files when the slow one is slower", () => {
    expect(playbackFor(audio, { normal: 1100, slow: 1500 }, "normal")).toEqual({ key: "n.mp3", rate: 1 });
    expect(playbackFor(audio, { normal: 1100, slow: 1500 }, "slow")).toEqual({ key: "s.mp3", rate: 1 });
  });
  it("slows the normal file down when the slow recording is not slower", () => {
    expect(playbackFor(audio, { normal: 1780, slow: 1660 }, "slow")).toEqual({ key: "n.mp3", rate: SLOW_RATE });
    expect(playbackFor(audio, { normal: 1500, slow: 1500 }, "slow")).toEqual({ key: "n.mp3", rate: SLOW_RATE });
  });
  it("trusts the slow file when durations are unknown (older snapshots)", () => {
    expect(playbackFor(audio, undefined, "slow")).toEqual({ key: "s.mp3", rate: 1 });
  });
  it("falls back when a file is missing", () => {
    expect(playbackFor({ normal: "n.mp3" }, undefined, "slow")).toEqual({ key: "n.mp3", rate: SLOW_RATE });
    expect(playbackFor({ slow: "s.mp3" }, undefined, "normal")).toEqual({ key: "s.mp3", rate: 1 });
    expect(playbackFor({}, undefined, "slow")).toBeNull();
  });
});
