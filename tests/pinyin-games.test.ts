import { describe, expect, it } from "vitest";
import { FINALS, INITIALS, TONE_SANDHI } from "../src/content/pronunciation";
import { seededRng } from "../src/domain/exercises";
import {
  buildBoss,
  buildSandhi,
  buildSoundPick,
  buildSpelling,
  buildToneDraw,
  EMPTY_PINYIN,
  fromListen,
  MISSIONS,
  missionStars,
  parsePinyin,
  recordMission,
  SPELLING_CARDS,
  totalStars,
  type PgQuestion,
} from "../src/domain/pinyin-games";
import { buildToneQuiz } from "../src/domain/pronunciation";

const rng = () => seededRng(11);
const sandhi = TONE_SANDHI.flatMap((g) => g.examples.map((e) => ({ ...e, rule: g.rule })));

function wellFormed(qs: PgQuestion[]) {
  expect(qs.length).toBeGreaterThan(0);
  for (const q of qs) {
    expect(q.options.length).toBeGreaterThanOrEqual(3);
    expect(new Set(q.options.map((o) => o.text)).size).toBe(q.options.length);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(q.options.length);
    expect(q.explain.length).toBeGreaterThan(3);
  }
}

describe("pinyin missions", () => {
  it("builds well-formed tone-drawing questions whose answer carries the right tone mark", () => {
    const qs = buildToneDraw(rng(), 8);
    wellFormed(qs);
    expect(qs).toHaveLength(8);
    for (const q of qs) expect(q.contour).toBeDefined();
    const marks = ["ā", "á", "ǎ", "à"];
    for (const q of qs) expect(q.options[q.answer]!.text).toMatch(new RegExp(`[${marks.join("")}]|[īíǐìūúǔùǖǘǚǜ]`));
  });
  it("builds initial and final listening picks with the sound itself as the right option", () => {
    const initials = buildSoundPick(INITIALS.map((g) => g.items), "thanh mẫu", rng(), 10);
    const finals = buildSoundPick(FINALS.map((g) => g.items), "vận mẫu", rng(), 10);
    wellFormed(initials);
    wellFormed(finals);
    for (const q of [...initials, ...finals]) {
      expect(q.hanzi).toBeTruthy();
      expect(q.explain).toContain(q.options[q.answer]!.text);
    }
  });
  it("spelling cards are consistent: the right spelling is never among the wrong ones", () => {
    for (const c of SPELLING_CARDS) {
      expect(c.wrong).not.toContain(c.right);
      expect(c.why.length).toBeGreaterThan(10);
    }
    const qs = buildSpelling(rng(), 8);
    wellFormed(qs);
    expect(qs).toHaveLength(8);
  });
  it("sandhi questions make the spoken form the answer, not the written one", () => {
    const qs = buildSandhi(sandhi, rng(), 6);
    wellFormed(qs);
    for (const q of qs) {
      const ex = sandhi.find((e) => e.hanzi === q.hanzi && e.spoken === q.options[q.answer]!.text);
      expect(ex).toBeDefined();
      expect(q.options.some((o) => o.text === ex!.written) || ex!.written === ex!.spoken).toBe(true);
    }
  });
  it("turns listening questions into missions and mixes everything for the final challenge", () => {
    const pool = [..."妈麻马骂八拔把爸他塔踏"].map((hanzi, i) => ({ hanzi, base: ["ma", "ma", "ma", "ma", "ba", "ba", "ba", "ba", "ta", "ta", "ta", "ta"][i]!, tone: (i % 4) + 1 }));
    const listen = fromListen(buildToneQuiz(pool, rng(), 6), "t");
    wellFormed(listen);
    const boss = buildBoss([listen, buildToneDraw(rng(), 4), buildSpelling(rng(), 4)], rng(), 10);
    expect(boss).toHaveLength(10);
    expect(new Set(boss.map((q) => q.id)).size).toBe(10);
  });
  it("lists nine missions with a memory aid each", () => {
    expect(MISSIONS).toHaveLength(9);
    for (const m of MISSIONS) expect(m.tip.length).toBeGreaterThan(0);
  });
});

describe("mission stars", () => {
  it("gives 3 stars from 90 %, 2 from 70 %, otherwise 1", () => {
    expect(missionStars(10, 10)).toBe(3);
    expect(missionStars(7, 10)).toBe(2);
    expect(missionStars(3, 10)).toBe(1);
  });
  it("keeps the best stars and says when something improved", () => {
    const a = recordMission(EMPTY_PINYIN, "tone-listen", 2);
    expect(a.improved).toBe(true);
    expect(recordMission(a.state, "tone-listen", 1)).toMatchObject({ improved: false });
    const b = recordMission(a.state, "tone-listen", 3);
    expect(b.improved).toBe(true);
    expect(totalStars(b.state)).toBe(3);
  });
  it("parses stored progress defensively", () => {
    expect(parsePinyin({ v: 1, stars: { "tone-listen": 3, junk: 2, sandhi: 9 } }).stars).toEqual({ "tone-listen": 3 });
    expect(parsePinyin("x")).toBe(EMPTY_PINYIN);
  });
});
