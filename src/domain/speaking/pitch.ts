/**
 * Pitch (F0) tracking for speaking practice (docs/SPEAKING_PLAN.md §2). Pure:
 * works on a mono Float32Array, no Web Audio. YIN (de Cheveigné & Kawahara 2002)
 * with the cumulative-mean-normalised difference and parabolic interpolation.
 */

export interface PitchFrame {
  /** seconds from the start of the signal (frame centre) */
  time: number;
  /** fundamental frequency in Hz, null for unvoiced / silent frames */
  f0: number | null;
  /** RMS energy of the frame */
  rms: number;
}

export interface PitchOptions {
  frameSec?: number;
  hopSec?: number;
  minHz?: number;
  maxHz?: number;
  /** YIN absolute threshold (lower = stricter voicing) */
  threshold?: number;
  /** frames quieter than this fraction of the loudest frame are treated as silence */
  silenceRatio?: number;
}

const DEFAULTS: Required<PitchOptions> = {
  frameSec: 0.04,
  hopSec: 0.01,
  minHz: 70,
  maxHz: 500,
  threshold: 0.15,
  silenceRatio: 0.08,
};

export function trackPitch(signal: Float32Array, sampleRate: number, options: PitchOptions = {}): PitchFrame[] {
  const o = { ...DEFAULTS, ...options };
  const frame = Math.round(o.frameSec * sampleRate);
  const hop = Math.max(1, Math.round(o.hopSec * sampleRate));
  const minTau = Math.max(2, Math.floor(sampleRate / o.maxHz));
  const maxTau = Math.min(Math.floor(sampleRate / o.minHz), frame - 1);
  const frames: PitchFrame[] = [];
  if (signal.length < frame + maxTau) return frames;

  const diff = new Float32Array(maxTau + 1);
  let maxRms = 0;
  const raw: Array<{ time: number; f0: number | null; rms: number }> = [];

  for (let start = 0; start + frame + maxTau <= signal.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < frame; i++) energy += signal[start + i]! * signal[start + i]!;
    const rms = Math.sqrt(energy / frame);
    maxRms = Math.max(maxRms, rms);

    // Difference function d(tau) and its cumulative-mean normalisation d'(tau).
    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let i = 0; i < frame; i++) {
        const d = signal[start + i]! - signal[start + i + tau]!;
        sum += d * d;
      }
      diff[tau] = sum;
    }
    let running = 0;
    let bestTau = -1;
    for (let tau = 1; tau <= maxTau; tau++) {
      running += diff[tau]!;
      diff[tau] = running === 0 ? 1 : (diff[tau]! * tau) / running;
    }
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (diff[tau]! < o.threshold) {
        // Walk down to the local minimum.
        while (tau + 1 <= maxTau && diff[tau + 1]! < diff[tau]!) tau++;
        bestTau = tau;
        break;
      }
    }
    let f0: number | null = null;
    if (bestTau > 0) {
      // Parabolic interpolation around the minimum for sub-sample precision.
      const a = diff[bestTau - 1] ?? diff[bestTau]!;
      const b = diff[bestTau]!;
      const c = diff[bestTau + 1] ?? diff[bestTau]!;
      const denom = a - 2 * b + c;
      const shift = denom === 0 ? 0 : (a - c) / (2 * denom);
      f0 = sampleRate / (bestTau + shift);
    }
    raw.push({ time: (start + frame / 2) / sampleRate, f0, rms });
  }

  for (const r of raw) {
    const silent = r.rms < maxRms * o.silenceRatio;
    frames.push({ time: r.time, rms: r.rms, f0: silent ? null : r.f0 });
  }
  return frames;
}

/** Linear-interpolation resampling to 16 kHz (enough for F0 up to 500 Hz). */
export function resample(signal: Float32Array, fromRate: number, toRate = 16000): Float32Array {
  if (fromRate === toRate) return signal;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(signal.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, signal.length - 1);
    out[i] = signal[i0]! + (signal[i1]! - signal[i0]!) * (x - i0);
  }
  return out;
}
