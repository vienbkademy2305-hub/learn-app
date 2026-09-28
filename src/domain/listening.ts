/** Listening modes of the example-sentence step (docs/LISTENING_PLAN.md §2.1). Pure. */

export const LISTEN_MODES = [
  { id: "all", label: "Xem đủ", hint: "Nghe và xem chữ Hán, pinyin, nghĩa." },
  { id: "hanzi", label: "Ẩn chữ Hán", hint: "Nghe và đọc pinyin — đoán chữ Hán rồi bấm “Hiện”." },
  { id: "pinyin", label: "Ẩn pinyin", hint: "Nghe và nhìn chữ Hán — tự đọc pinyin trong đầu." },
  { id: "meaning", label: "Ẩn nghĩa", hint: "Nghe và tự hiểu nghĩa trước khi xem bản dịch." },
] as const;

export type ListenMode = (typeof LISTEN_MODES)[number]["id"];

/** Parts of a sentence card that a mode can hide (matched by `data-part` in the markup). */
export type SentencePart = Exclude<ListenMode, "all">;

export function parseListenMode(raw: unknown): ListenMode {
  return LISTEN_MODES.some((m) => m.id === raw) ? (raw as ListenMode) : "all";
}

/** Speed of the source's "slow" synthesis (hsk-sentences-audio scripts/synth_audio.py: speed=0.8). */
export const SLOW_RATE = 0.8;

export interface Playback {
  key: string;
  rate: number;
}

/**
 * Which file and playback rate to use for a speed.
 * The source synthesised the slow recording separately, and for some sentences it came
 * out no longer than the normal one (docs/LISTENING_PLAN.md §3). In that case — or when
 * no slow file exists — "slow" plays the normal recording at SLOW_RATE instead.
 */
export function playbackFor(
  audio: { normal?: string; slow?: string },
  durations: { normal?: number; slow?: number } | undefined,
  speed: "normal" | "slow",
): Playback | null {
  if (speed === "normal") {
    const key = audio.normal ?? audio.slow;
    return key ? { key, rate: 1 } : null;
  }
  const slowIsSlower = audio.slow && !(durations?.normal && durations.slow && durations.slow <= durations.normal);
  if (audio.slow && slowIsSlower) return { key: audio.slow, rate: 1 };
  return audio.normal ? { key: audio.normal, rate: SLOW_RATE } : audio.slow ? { key: audio.slow, rate: 1 } : null;
}
