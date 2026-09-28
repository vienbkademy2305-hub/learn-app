/**
 * Minimal MP3 inspection for the audio check (docs/LISTENING_PLAN.md §3):
 * walks MPEG audio frames and sums their samples to get the duration.
 * Handles an ID3v2 tag at the start; MPEG 1/2/2.5, Layer III.
 */

const BITRATES: Record<string, number[]> = {
  // kbps by bitrate index (0 = free, 15 = bad)
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG 1
  2: [22050, 24000, 16000], // MPEG 2
  0: [11025, 12000, 8000], // MPEG 2.5
};

export interface Mp3Info {
  frames: number;
  durationSec: number;
  sampleRate: number;
}

function id3Size(buf: Buffer): number {
  if (buf.length < 10 || buf.toString("latin1", 0, 3) !== "ID3") return 0;
  // Syncsafe integer: 4 × 7 bits.
  const size = ((buf[6]! & 0x7f) << 21) | ((buf[7]! & 0x7f) << 14) | ((buf[8]! & 0x7f) << 7) | (buf[9]! & 0x7f);
  const footer = buf[5]! & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

/** Returns null when no valid Layer III frame is found. */
export function inspectMp3(buf: Buffer): Mp3Info | null {
  let pos = id3Size(buf);
  let frames = 0;
  let samples = 0;
  let sampleRate = 0;

  while (pos + 4 <= buf.length) {
    const b1 = buf[pos + 1]!;
    if (buf[pos] !== 0xff || (b1 & 0xe0) !== 0xe0) {
      if (frames > 0) break; // trailing tag (e.g. ID3v1) or garbage after the audio
      pos++;
      continue;
    }
    const version = (b1 >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (b1 >> 1) & 0x03; // 1 = Layer III
    const b2 = buf[pos + 2]!;
    const bitrateIdx = (b2 >> 4) & 0x0f;
    const srIdx = (b2 >> 2) & 0x03;
    const padding = (b2 >> 1) & 0x01;
    if (version === 1 || layer !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || srIdx === 3) {
      if (frames > 0) break;
      pos++;
      continue;
    }
    const sr = SAMPLE_RATES[version]![srIdx]!;
    const kbps = BITRATES[version === 3 ? "v1" : "v2"]![bitrateIdx]!;
    const samplesPerFrame = version === 3 ? 1152 : 576;
    const length = Math.floor(((samplesPerFrame / 8) * kbps * 1000) / sr) + padding;
    if (length < 4) break;
    frames++;
    samples += samplesPerFrame;
    sampleRate = sr;
    pos += length;
  }
  return frames === 0 ? null : { frames, durationSec: samples / sampleRate, sampleRate };
}
