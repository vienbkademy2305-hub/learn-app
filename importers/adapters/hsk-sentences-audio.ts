/**
 * Adapter for repos/hsk-sentences-audio. Uses the prebuilt dataset in dist/
 * (no Python pipeline). Types mirror the fields verified in docs/REPO_AUDIT.md §4.
 */
import { readFileSync } from "node:fs";

export const HSK_SENTENCES_FILES = {
  sentences: "dist/sentences.json",
  grammar: "data/grammar_points.json",
  reviewFlags: "dist/review_flags.txt",
  audioDir: "dist",
} as const;

export interface HskToken {
  word: string;
  pinyin: string;
  gloss_en?: string;
}

export interface HskSentence {
  id: string;
  hsk_level: number;
  topic: string;
  sentence_type: string;
  chinese: string;
  traditional: string;
  pinyin: string;
  pinyin_numbered: string;
  translation: { en?: string; vi?: string };
  tokens: HskToken[];
  grammar_points: string[];
  grammar_tags: string[];
  audio: { normal: string; slow: string };
  audio_meta: { engine: string; voice: string; license: string; sample_rate: number };
}

export interface HskGrammarPoint {
  id: string;
  level: number;
  cat: string;
  sub: string;
  label: string;
  label_full: string;
  pattern: string | null;
  exclude: string | null;
  examples: string[];
}

export function readSentences(file: string): HskSentence[] {
  return JSON.parse(readFileSync(file, "utf8")) as HskSentence[];
}

export function readGrammarPoints(file: string): HskGrammarPoint[] {
  return JSON.parse(readFileSync(file, "utf8")) as HskGrammarPoint[];
}

export interface ReviewFlag {
  sentenceId: string;
  note: string;
}

/** Lines like "hsk6-0001 「的」de -> polyphone?" */
export function readReviewFlags(file: string): ReviewFlag[] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => {
      const space = line.indexOf(" ");
      return { sentenceId: line.slice(0, space), note: line.slice(space + 1).trim() };
    });
}
