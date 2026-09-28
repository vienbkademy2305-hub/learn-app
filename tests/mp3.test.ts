import { describe, expect, it } from "vitest";
import { inspectMp3 } from "../importers/lib/mp3";

/** Silent MPEG-1 Layer III frames: 128 kbps, 44.1 kHz, no padding → 417 bytes, 1152 samples each. */
function frames(n: number): Buffer {
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  return Buffer.concat(Array.from({ length: n }, () => frame));
}

describe("inspectMp3", () => {
  it("sums frame samples into a duration", () => {
    const info = inspectMp3(frames(100))!;
    expect(info.frames).toBe(100);
    expect(info.sampleRate).toBe(44100);
    expect(info.durationSec).toBeCloseTo((100 * 1152) / 44100, 6);
  });
  it("skips a leading ID3v2 tag and stops at a trailing ID3v1 tag", () => {
    const id3 = Buffer.concat([Buffer.from("ID3"), Buffer.from([4, 0, 0, 0, 0, 0, 20]), Buffer.alloc(20)]);
    const tail = Buffer.concat([Buffer.from("TAG"), Buffer.alloc(125)]);
    expect(inspectMp3(Buffer.concat([id3, frames(10), tail]))!.frames).toBe(10);
  });
  it("rejects data that is not MPEG audio", () => {
    expect(inspectMp3(Buffer.from("<!doctype html><html>404</html>"))).toBeNull();
  });
});
