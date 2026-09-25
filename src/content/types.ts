/**
 * Content snapshot consumed by the static site (PHASE2_PLAN §4). Produced by
 * `pnpm content:export` from the canonical database; publishable sources only.
 */

export interface ContentSnapshot {
  version: 1;
  generatedAt: string;
  level: string;
  sources: Array<{ id: string; name: string; url: string; license: string }>;
  lessons: LessonData[];
  words: Record<string, WordData>;
  sentences: Record<string, SentenceData>;
}

export interface LessonData {
  slug: string;
  number: number;
  title: string;
  hskLevel: string;
  status: string;
  /** word slugs of the vocabulary step, in order */
  words: string[];
  /** sentence keys of the examples step, in order */
  sentences: string[];
}

export interface WordData {
  slug: string;
  simplified: string;
  traditional: string | null;
  pinyin: string;
  hskLevel: string | null;
  inCurriculum: boolean;
  /** `stroke`: storage key of the hanzi-writer stroke data, null when the character has none. */
  chars: Array<{ hanzi: string; pinyin: string | null; sinoViet: string[]; stroke: string | null }>;
  /** Vietnamese meanings, hand-written glosses (hsk1-chinese-learning) first, then CVDICT. */
  meanings: string[];
  measureWords: string[];
  /** English meanings (complete-hsk-vocabulary / CC-CEDICT) — secondary to Vietnamese. */
  meaningsEn: string[];
  /** sentence keys containing the word, best first */
  examples: string[];
  /** lesson slugs whose vocabulary step contains the word */
  lessons: string[];
}

export interface SentenceData {
  key: string;
  simplified: string;
  pinyin: string | null;
  hskLevel: string | null;
  tokens: Array<{ text: string; word: string | null }>;
  vi: { text: string; draft: boolean } | null;
  en: string | null;
  /** storage keys, resolved to URLs by src/lib/storage-url.ts */
  audio: { normal?: string; slow?: string };
}
