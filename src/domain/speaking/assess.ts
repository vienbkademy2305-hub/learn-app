/**
 * On-device pronunciation scoring (docs/SPEAKING_PLAN.md §1). Pure.
 * - Words: tone of each syllable from its pitch contour vs tone templates (after sandhi).
 * - Sentences: pitch-contour shape vs the reference recording (DTW).
 * Measures tones / intonation only — never consonants or vowels; results say so.
 */
import type { PitchFrame } from "./pitch";

export type Tone = 1 | 2 | 3 | 4 | 5;

// ── Tones of a word ──────────────────────────────────────────────────────────

/** Tones of a canonical pinyin key: "ni3hao3" → [3, 3]. */
export function tonesFromKey(pinyinKey: string): Tone[] {
  return (pinyinKey.match(/[a-zv:]+([1-5])/g) ?? []).map((s) => Number(s.at(-1)) as Tone);
}

/** Mandarin tone sandhi on citation tones: 3-3, 不, 一. */
export function applySandhi(hanzi: string, tones: Tone[]): Tone[] {
  const chars = [...hanzi];
  const out = [...tones];
  for (let i = 0; i < out.length - 1; i++) {
    const next = tones[i + 1]!;
    if (tones[i] === 3 && next === 3) out[i] = 2;
    if (chars[i] === "不" && tones[i] === 4 && next === 4) out[i] = 2;
    if (chars[i] === "一" && tones[i] === 1 && chars[i - 1] !== "第") out[i] = next === 4 ? 2 : next === 5 ? 1 : 4;
  }
  return out;
}

// ── Contours ─────────────────────────────────────────────────────────────────

const POINTS = 10;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const semitones = (f: number, ref: number) => 12 * Math.log2(f / ref);

/** Resamples a sequence to n points (linear). */
export function resampleCurve(values: number[], n: number): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return Array.from({ length: n }, () => values[0]!);
  return Array.from({ length: n }, (_, i) => {
    const x = (i * (values.length - 1)) / (n - 1);
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, values.length - 1);
    return values[i0]! + (values[i1]! - values[i0]!) * (x - i0);
  });
}

function smooth(values: number[]): number[] {
  return values.map((_, i) => median(values.slice(Math.max(0, i - 1), i + 2)));
}

/** Voiced runs (indices into frames). Gaps of ≤ 2 unvoiced frames are bridged. */
export function voicedRuns(frames: PitchFrame[], minFrames = 5): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  let gap = 0;
  frames.forEach((f, i) => {
    if (f.f0 !== null) {
      current.push(i);
      gap = 0;
    } else if (current.length) {
      gap++;
      if (gap > 2) {
        runs.push(current);
        current = [];
        gap = 0;
      }
    }
  });
  if (current.length) runs.push(current);
  return runs.filter((r) => r.length >= minFrames);
}

/** Splits the voiced part of an utterance into n syllables: silence-separated runs, else equal parts. */
export function segmentSyllables(frames: PitchFrame[], n: number): number[][] {
  const runs = voicedRuns(frames);
  if (runs.length === 0 || n === 0) return [];
  if (runs.length >= n) {
    // Keep the n longest runs (drops clicks / partial noise), in time order.
    return [...runs].sort((a, b) => b.length - a.length).slice(0, n).sort((a, b) => a[0]! - b[0]!);
  }
  const all = runs.flat();
  return Array.from({ length: n }, (_, k) => all.slice(Math.floor((k * all.length) / n), Math.floor(((k + 1) * all.length) / n)));
}

// ── Tone templates (semitones relative to the speaker's median pitch) ────────

const TEMPLATES: Record<1 | 2 | 3 | 4, number[][]> = {
  1: [resampleCurve([2.5, 2.5], POINTS)],
  2: [resampleCurve([-1, -0.5, 3.5], POINTS)],
  // Full dipping 214 (citation form) and half-third 21 (common inside phrases).
  3: [resampleCurve([-2, -4.5, -5, -2.5], POINTS), resampleCurve([-2, -4, -5, -5], POINTS)],
  4: [resampleCurve([4, -4], POINTS)],
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
function distance(contour: number[], template: number[], useLevel: boolean): number {
  const cm = mean(contour);
  const tm = mean(template);
  // Shape (mean removed) always counts; absolute level only when the utterance has
  // several syllables (a single syllable is its own reference, so its level is ~0).
  const shape = Math.sqrt(mean(contour.map((v, i) => (v - cm - (template[i]! - tm)) ** 2)));
  return shape + (useLevel ? 0.35 * Math.abs(cm - tm) : 0);
}

export function classifyTone(contour: number[], useLevel: boolean): { tone: 1 | 2 | 3 | 4; distances: Record<1 | 2 | 3 | 4, number> } {
  const distances = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<1 | 2 | 3 | 4, number>;
  for (const t of [1, 2, 3, 4] as const) distances[t] = Math.min(...TEMPLATES[t].map((tpl) => distance(contour, tpl, useLevel)));
  const tone = ([1, 2, 3, 4] as const).reduce((best, t) => (distances[t] < distances[best] ? t : best), 1 as 1 | 2 | 3 | 4);
  return { tone, distances };
}

// ── Assessment ───────────────────────────────────────────────────────────────

export type AssessStatus = "ok" | "no-voice" | "too-short" | "too-quiet";

export interface SyllableResult {
  expected: Tone;
  heard: 1 | 2 | 3 | 4 | null;
  /** 0–100, null for neutral tone (not scored) */
  score: number | null;
  /** normalised contour (semitones), for the chart */
  contour: number[];
  tip: string | null;
}

export interface WordAssessment {
  status: AssessStatus;
  score: number | null;
  syllables: SyllableResult[];
  message: string;
}

export interface SignalStats {
  peak: number;
  clippedRatio: number;
}

export function signalStats(signal: Float32Array): SignalStats {
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < signal.length; i++) {
    const a = Math.abs(signal[i]!);
    if (a > peak) peak = a;
    if (a > 0.99) clipped++;
  }
  return { peak, clippedRatio: signal.length ? clipped / signal.length : 0 };
}

const TIPS: Partial<Record<string, string>> = {
  "1>2": "Thanh 1 giữ cao và phẳng — đừng lên giọng ở cuối.",
  "1>3": "Thanh 1 giữ cao và phẳng — giọng của bạn đang bị hạ xuống.",
  "1>4": "Thanh 1 giữ cao và phẳng — đừng hạ giọng như thanh 4.",
  "2>1": "Thanh 2 phải đi lên rõ (giống dấu sắc kéo dài) — giọng bạn đang phẳng.",
  "2>3": "Thanh 2 đi thẳng lên, đừng chúi xuống trước rồi mới lên.",
  "2>4": "Thanh 2 đi lên, không phải đi xuống.",
  "3>1": "Thanh 3 phải xuống thấp (giống dấu hỏi/nặng kéo dài) — giọng bạn đang giữ cao.",
  "3>2": "Thanh 3 xuống thật thấp trước; đừng đi lên ngay như thanh 2.",
  "3>4": "Thanh 3 xuống thấp và giữ thấp, không rơi mạnh từ cao như thanh 4.",
  "4>1": "Thanh 4 rơi mạnh từ cao xuống thấp (dứt khoát như ra lệnh).",
  "4>2": "Thanh 4 đi xuống, không phải đi lên.",
  "4>3": "Thanh 4 bắt đầu cao rồi rơi nhanh; đừng bắt đầu thấp.",
};

/** 0 semitones RMS from the template → 100; ≥ 5 → 0. */
const distanceToScore = (d: number) => Math.round(Math.max(0, Math.min(100, 100 - (Math.max(0, d - 0.6) / 4.4) * 100)));

export function assessWord(frames: PitchFrame[], expected: Tone[], stats?: SignalStats): WordAssessment {
  const fail = (status: AssessStatus, message: string): WordAssessment => ({ status, score: null, syllables: [], message });
  if (stats && stats.peak < 0.02) return fail("too-quiet", "Giọng quá nhỏ — hãy nói to hơn hoặc để micro gần hơn.");
  const voiced = frames.filter((f) => f.f0 !== null);
  if (voiced.length === 0) return fail("no-voice", "Không nghe thấy giọng nói. Kiểm tra micro rồi thử lại.");
  if (voiced.length < 12 * expected.length) return fail("too-short", "Bản ghi quá ngắn — hãy đọc rõ và kéo dài hơn một chút.");

  const ref = median(voiced.map((f) => f.f0!));
  const parts = segmentSyllables(frames, expected.length);
  const useLevel = expected.length > 1;
  const syllables: SyllableResult[] = expected.map((tone, i) => {
    const idx = parts[i] ?? [];
    const st = idx.map((j) => frames[j]!.f0).filter((f): f is number => f !== null).map((f) => semitones(f, ref));
    // Drop 10% at each edge: onsets/offsets are unstable.
    const cut = Math.floor(st.length * 0.1);
    const contour = resampleCurve(smooth(st.slice(cut, st.length - cut || undefined)), POINTS);
    if (tone === 5 || contour.length === 0) return { expected: tone, heard: null, score: null, contour, tip: null };
    const { tone: heard, distances } = classifyTone(contour, useLevel);
    let score = distanceToScore(distances[tone as 1 | 2 | 3 | 4]);
    // Clearly closer to another tone → cap the score.
    if (heard !== tone && distances[heard] + 0.5 < distances[tone as 1 | 2 | 3 | 4]) score = Math.min(score, 40);
    const tip = heard !== tone && score <= 60 ? (TIPS[`${tone}>${heard}`] ?? null) : null;
    return { expected: tone, heard, score, contour, tip };
  });

  const scored = syllables.filter((s) => s.score !== null).map((s) => s.score!);
  const score = scored.length ? Math.round(mean(scored)) : null;
  const message =
    score === null
      ? "Từ này chỉ có thanh nhẹ — không chấm thanh điệu."
      : score >= 85
        ? "Thanh điệu rất tốt!"
        : score >= 65
          ? "Khá tốt — nghe lại mẫu và chỉnh các âm tiết bị đánh dấu."
          : "Thanh điệu chưa đúng — nghe mẫu chậm, rồi thử lại từng âm tiết.";
  return { status: "ok", score, syllables, message };
}

// ── Sentences: contour vs reference (DTW) ────────────────────────────────────

/** Voiced-only contour in semitones relative to the speaker's median, smoothed. */
export function utteranceContour(frames: PitchFrame[], maxPoints = 120): number[] {
  const f0 = frames.map((f) => f.f0).filter((f): f is number => f !== null);
  if (f0.length === 0) return [];
  const ref = median(f0);
  const st = smooth(f0.map((f) => semitones(f, ref)));
  return st.length > maxPoints ? resampleCurve(st, maxPoints) : st;
}

/**
 * DTW-aligned distance (semitones) between a learner contour `a` and a reference `b`.
 * Averaged per REFERENCE point, so every part of the model melody weighs the same:
 * a flat reading cannot score well by warping onto the flat parts of the reference.
 */
const SLOPE_WEIGHT = 6;

/** Local slope (semitones per point) — lets DTW compare rises and falls, not just levels. */
function slopes(c: number[]): number[] {
  return c.map((_, i) => (c[Math.min(c.length - 1, i + 2)]! - c[Math.max(0, i - 2)]!) / 4);
}

export function dtwDistance(a: number[], b: number[]): number {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;
  const da = slopes(a);
  const db = slopes(b);
  // Point cost: level difference plus weighted slope difference.
  const pointCost = (i: number, j: number) => Math.abs(a[i]! - b[j]!) + SLOPE_WEIGHT * Math.abs(da[i]! - db[j]!);
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Number.POSITIVE_INFINITY));
  const move = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1)); // 0 diag, 1 up (i-1), 2 left (j-1)
  cost[0]![0] = 0;
  // Warping window: speaking speed may differ, but whole syllables should not be skipped.
  const band = Math.ceil(Math.max(n, m) * 0.12);
  for (let i = 1; i <= n; i++) {
    const jFrom = Math.max(1, Math.floor((i * m) / n) - band);
    const jTo = Math.min(m, Math.ceil((i * m) / n) + band);
    for (let j = jFrom; j <= jTo; j++) {
      const d = pointCost(i - 1, j - 1);
      const diag = cost[i - 1]![j - 1]!;
      const up = cost[i - 1]![j]!;
      const left = cost[i]![j - 1]!;
      const best = Math.min(diag, up, left);
      cost[i]![j] = best + d;
      move[i]![j] = best === diag ? 0 : best === up ? 1 : 2;
    }
  }
  if (!Number.isFinite(cost[n]![m]!)) return Infinity;
  // Backtrack and average the differences matched to each reference point.
  const sum = new Float64Array(m);
  const count = new Uint16Array(m);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    sum[j - 1]! += pointCost(i - 1, j - 1);
    count[j - 1]!++;
    const mv = move[i]![j]!;
    if (mv === 0) {
      i--;
      j--;
    } else if (mv === 1) i--;
    else j--;
  }
  let total = 0;
  let used = 0;
  for (let k = 0; k < m; k++) {
    if (!count[k]) continue;
    total += sum[k]! / count[k]!;
    used++;
  }
  return used ? total / used : Infinity;
}

export interface SentenceAssessment {
  status: AssessStatus;
  score: number | null;
  learner: number[];
  reference: number[];
  /** learner voiced duration / reference voiced duration */
  lengthRatio: number | null;
  message: string;
}

export function assessSentence(learnerFrames: PitchFrame[], referenceFrames: PitchFrame[], stats?: SignalStats): SentenceAssessment {
  const reference = utteranceContour(referenceFrames);
  const fail = (status: AssessStatus, message: string): SentenceAssessment => ({ status, score: null, learner: [], reference, lengthRatio: null, message });
  if (stats && stats.peak < 0.02) return fail("too-quiet", "Giọng quá nhỏ — hãy nói to hơn hoặc để micro gần hơn.");
  const learnerVoiced = learnerFrames.filter((f) => f.f0 !== null).length;
  const refVoiced = referenceFrames.filter((f) => f.f0 !== null).length;
  if (learnerVoiced === 0) return fail("no-voice", "Không nghe thấy giọng nói. Kiểm tra micro rồi thử lại.");
  if (learnerVoiced < refVoiced * 0.3) return fail("too-short", "Bản ghi quá ngắn so với câu mẫu — hãy đọc hết cả câu.");

  const learner = utteranceContour(learnerFrames);
  const d = dtwDistance(learner, reference);
  // Calibrated on synthetic melodies (tests/speaking.test.ts): same melody at another pitch/speed
  // ≈ 0.2–0.35, one wrong tone of three ≈ 2.2, flat reading ≈ 2.5 → 100 at ≤ 0.4, 0 at ≥ 3.8.
  const score = Math.round(Math.max(0, Math.min(100, 100 - (Math.max(0, d - 0.4) / 3.4) * 100)));
  const lengthRatio = learnerVoiced / Math.max(1, refVoiced);
  const pace = lengthRatio > 1.8 ? " Bạn đọc chậm hơn mẫu khá nhiều." : lengthRatio < 0.6 ? " Bạn đọc nhanh hơn mẫu — thử chậm lại." : "";
  const message =
    (score >= 80 ? "Ngữ điệu rất giống câu mẫu!" : score >= 60 ? "Ngữ điệu khá giống mẫu." : "Ngữ điệu còn khác mẫu — nghe bản chậm rồi bắt chước lên xuống giọng.") + pace;
  return { status: "ok", score, learner, reference, lengthRatio, message };
}

/** Template contour of a tone (semitones), for charts. The first variant for tone 3. */
export function toneTemplate(tone: Tone): number[] {
  return tone === 5 ? [] : TEMPLATES[tone][0]!;
}
