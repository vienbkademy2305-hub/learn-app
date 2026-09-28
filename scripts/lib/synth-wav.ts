/**
 * Synthetic "voice" WAV files for the speaking smoke test: harmonic tones that
 * follow Mandarin tone contours, written as 16-bit PCM mono (the format Chromium's
 * --use-file-for-fake-audio-capture reads).
 */
import { writeFileSync } from "node:fs";

const SR = 16000;
const lerp = (pts: number[]) => (t: number) => {
  const x = t * (pts.length - 1);
  const i = Math.min(Math.floor(x), pts.length - 2);
  return pts[i]! + (pts[i + 1]! - pts[i]!) * (x - i);
};
export const TONE_CURVES = {
  1: lerp([235, 235]),
  2: lerp([190, 195, 250]),
  3: lerp([185, 160, 150, 180]),
  4: lerp([260, 160]),
} as const;

function voiced(seconds: number, pitch: (t: number) => number): number[] {
  const n = Math.round(seconds * SR);
  const out: number[] = [];
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += (2 * Math.PI * pitch(i / n)) / SR;
    const env = Math.min(1, i / 160, (n - i) / 160);
    out.push((0.5 * env * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase))) / 1.75);
  }
  return out;
}
const silence = (seconds: number) => new Array<number>(Math.round(seconds * SR)).fill(0);

/** A word spoken with the given tones, surrounded by silence. */
export function writeToneWav(file: string, tones: Array<1 | 2 | 3 | 4>, tailSeconds = 4): void {
  const samples = [...silence(0.3), ...tones.flatMap((t) => [...voiced(0.32, TONE_CURVES[t]), ...silence(0.12)]), ...silence(tailSeconds)];
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
}
