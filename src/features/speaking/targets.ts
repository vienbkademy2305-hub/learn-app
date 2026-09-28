/** Server-side: speaking targets built from the content snapshot (docs/SPEAKING_PLAN.md §3). */
import type { SentenceData, WordData } from "@/content/types";
import { speakKey } from "@/domain/progress";
import type { SpeakTarget } from "./SpeakingPanel";

export function wordTarget(w: WordData): SpeakTarget {
  return {
    kind: "word",
    key: speakKey.word(w.slug),
    hanzi: w.simplified,
    pinyin: w.pinyin,
    pinyinKey: w.slug.split("-")[0]!,
    meaning: w.meanings[0] ?? null,
  };
}

export function sentenceTarget(s: SentenceData): SpeakTarget {
  return {
    kind: "sentence",
    key: speakKey.sentence(s.key),
    hanzi: s.simplified,
    pinyin: s.pinyin,
    vi: s.vi?.text ?? null,
    audio: s.audio,
    audioMs: s.audioMs,
  };
}
