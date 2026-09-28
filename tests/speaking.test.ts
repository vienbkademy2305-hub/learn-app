import { describe, expect, it } from "vitest";
import {
  applySandhi,
  assessSentence,
  assessWord,
  classifyTone,
  dtwDistance,
  segmentSyllables,
  signalStats,
  tonesFromKey,
  utteranceContour,
} from "../src/domain/speaking/assess";
import { resample, trackPitch } from "../src/domain/speaking/pitch";

const SR = 16000;

/** Voice-like test signal: harmonics 1–4 following a pitch curve f(t) (t in 0..1 of the segment). */
function voiced(seconds: number, pitch: (t: number) => number, amp = 0.4): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const f = pitch(i / n);
    phase += (2 * Math.PI * f) / SR;
    // Short fade in/out avoids clicks at the edges.
    const env = Math.min(1, i / 160, (n - i) / 160);
    out[i] = amp * env * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase) + 0.12 * Math.sin(4 * phase)) / 1.9;
  }
  return out;
}
const silence = (seconds: number) => new Float32Array(Math.round(seconds * SR));
const concat = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const lerp = (pts: number[]) => (t: number) => {
  const x = t * (pts.length - 1);
  const i = Math.min(Math.floor(x), pts.length - 2);
  return pts[i]! + (pts[i + 1]! - pts[i]!) * (x - i);
};
// Speaker around 200 Hz (≈ 2 semitones ≈ 12%).
const TONE_CURVES = {
  1: lerp([235, 235]),
  2: lerp([190, 195, 250]),
  3: lerp([185, 160, 150, 180]),
  4: lerp([260, 160]),
} as const;
const word = (...tones: Array<1 | 2 | 3 | 4>) =>
  concat(silence(0.2), ...tones.flatMap((t) => [voiced(0.32, TONE_CURVES[t]), silence(0.12)]), silence(0.2));

describe("trackPitch", () => {
  it("measures a steady 200 Hz voice within 2%", () => {
    const frames = trackPitch(voiced(0.5, () => 200), SR);
    const f0 = frames.map((f) => f.f0).filter((f): f is number => f !== null);
    expect(f0.length).toBeGreaterThan(30);
    const mid = f0.sort((a, b) => a - b)[Math.floor(f0.length / 2)]!;
    expect(Math.abs(mid - 200) / 200).toBeLessThan(0.02);
  });
  it("reports silence as unvoiced", () => {
    expect(trackPitch(silence(0.5), SR).every((f) => f.f0 === null)).toBe(true);
  });
  it("follows a rising pitch", () => {
    const f0 = trackPitch(voiced(0.5, lerp([150, 300])), SR).map((f) => f.f0).filter((f): f is number => f !== null);
    expect(f0.at(-1)! - f0[0]!).toBeGreaterThan(100);
  });
  it("resamples without changing the pitch", () => {
    const at48k = new Float32Array(48000 / 2).map((_, i) => Math.sin((2 * Math.PI * 220 * i) / 48000) * 0.5);
    const f0 = trackPitch(resample(at48k, 48000), SR).map((f) => f.f0).filter((f): f is number => f !== null);
    expect(Math.abs(f0[Math.floor(f0.length / 2)]! - 220)).toBeLessThan(5);
  });
});

describe("tones and sandhi", () => {
  it("reads tones from a pinyin key", () => {
    expect(tonesFromKey("ni3hao3")).toEqual([3, 3]);
    expect(tonesFromKey("xie4xie5")).toEqual([4, 5]);
    expect(tonesFromKey("nv3er2")).toEqual([3, 2]);
  });
  it("applies 3-3, 不 and 一 sandhi", () => {
    expect(applySandhi("你好", [3, 3])).toEqual([2, 3]);
    expect(applySandhi("不是", [4, 4])).toEqual([2, 4]);
    expect(applySandhi("不好", [4, 3])).toEqual([4, 3]);
    expect(applySandhi("一个", [1, 4])).toEqual([2, 4]);
    expect(applySandhi("一天", [1, 1])).toEqual([4, 1]);
    expect(applySandhi("第一", [4, 1])).toEqual([4, 1]);
  });
});

describe("classifyTone", () => {
  for (const tone of [1, 2, 3, 4] as const) {
    it(`recognises tone ${tone} on a single syllable`, () => {
      const r = assessWord(trackPitch(word(tone), SR), [tone]);
      expect(r.status).toBe("ok");
      expect(r.syllables[0]!.heard).toBe(tone);
      expect(r.score).toBeGreaterThanOrEqual(70);
    });
  }
  it("tells tone 2 from tone 3 by shape", () => {
    const rise = [-1, -0.8, -0.5, 0, 0.6, 1.2, 1.9, 2.6, 3.1, 3.5];
    expect(classifyTone(rise, false).tone).toBe(2);
  });
});

describe("assessWord", () => {
  it("scores 你好 (after sandhi 2-3) high when spoken with tones 2 and 3", () => {
    const expected = applySandhi("你好", tonesFromKey("ni3hao3"));
    const r = assessWord(trackPitch(word(2, 3), SR), expected, signalStats(word(2, 3)));
    expect(r.syllables.map((s) => s.heard)).toEqual([2, 3]);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });
  it("gives a low score and a Vietnamese tip when a tone is wrong", () => {
    const r = assessWord(trackPitch(word(1, 1), SR), [2, 3]);
    expect(r.score).toBeLessThan(50);
    expect(r.syllables.some((s) => s.tip && /Thanh/.test(s.tip))).toBe(true);
  });
  it("does not score neutral tones", () => {
    const r = assessWord(trackPitch(word(4, 1), SR), [4, 5]);
    expect(r.syllables[1]!.score).toBeNull();
    expect(r.score).toBe(r.syllables[0]!.score);
  });
  it("refuses to score silence or a too-quiet recording", () => {
    expect(assessWord(trackPitch(silence(1), SR), [1]).status).toBe("no-voice");
    const quiet = voiced(0.5, () => 200, 0.005);
    expect(assessWord(trackPitch(quiet, SR), [1], signalStats(quiet)).status).toBe("too-quiet");
  });
  it("splits syllables on pauses, ignoring short noise bursts", () => {
    const sig = concat(voiced(0.03, () => 300), silence(0.2), word(2, 4));
    const parts = segmentSyllables(trackPitch(sig, SR), 2);
    expect(parts).toHaveLength(2);
    expect(parts.every((p) => p.length > 20)).toBe(true);
  });
});

describe("assessSentence", () => {
  const reference = concat(silence(0.2), voiced(0.3, TONE_CURVES[1]), voiced(0.3, TONE_CURVES[4]), voiced(0.3, TONE_CURVES[2]), silence(0.2));
  const refFrames = trackPitch(reference, SR);
  it("scores the same melody high even at another pitch and speed", () => {
    // A lower voice (×0.8) speaking 20% slower.
    const lower = (c: (t: number) => number) => (t: number) => c(t) * 0.8;
    const learner = concat(silence(0.3), voiced(0.36, lower(TONE_CURVES[1])), voiced(0.36, lower(TONE_CURVES[4])), voiced(0.36, lower(TONE_CURVES[2])), silence(0.2));
    const r = assessSentence(trackPitch(learner, SR), refFrames);
    expect(r.status).toBe("ok");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });
  it("scores a different melody lower", () => {
    const flat = concat(silence(0.2), voiced(0.9, () => 200), silence(0.2));
    const r = assessSentence(trackPitch(flat, SR), refFrames);
    expect(r.score).toBeLessThan(60);
  });
  it("needs most of the sentence", () => {
    const short = concat(silence(0.2), voiced(0.1, TONE_CURVES[1]), silence(0.2));
    expect(assessSentence(trackPitch(short, SR), refFrames).status).toBe("too-short");
  });
  it("DTW distance is zero for identical contours", () => {
    const c = utteranceContour(refFrames);
    expect(dtwDistance(c, c)).toBe(0);
  });
});

describe("assessSentence calibration", () => {
  const T = TONE_CURVES;
  const sentence = (...tones: Array<1 | 2 | 3 | 4>) => concat(silence(0.2), ...tones.map((t) => voiced(0.3, T[t])), silence(0.2));
  const ref = trackPitch(sentence(1, 4, 2), SR);
  it("one wrong tone out of three lands in the 'needs work' band", () => {
    const r = assessSentence(trackPitch(sentence(1, 2, 2), SR), ref);
    expect(r.score).toBeGreaterThan(20);
    expect(r.score).toBeLessThan(65);
  });
  it("orders: same melody > one tone wrong > all tones wrong", () => {
    const same = assessSentence(trackPitch(sentence(1, 4, 2), SR), ref).score!;
    const one = assessSentence(trackPitch(sentence(1, 2, 2), SR), ref).score!;
    const all = assessSentence(trackPitch(sentence(2, 3, 1), SR), ref).score!;
    expect(same).toBeGreaterThan(one);
    expect(one).toBeGreaterThan(all);
  });
});

describe("speaking progress", () => {
  it("keeps attempts, best and last score per target", async () => {
    const { EMPTY_PROGRESS, recordSpeaking, speakKey, parseProgress } = await import("../src/domain/progress");
    let s = recordSpeaking(EMPTY_PROGRESS, speakKey.word("ni3hao3-4f60-597d"), 60);
    s = recordSpeaking(s, speakKey.word("ni3hao3-4f60-597d"), 45);
    expect(s.speaking!["word:ni3hao3-4f60-597d"]).toMatchObject({ attempts: 2, best: 60, last: 45 });
    expect(parseProgress(JSON.parse(JSON.stringify(s))).speaking).toEqual(s.speaking);
  });
});
