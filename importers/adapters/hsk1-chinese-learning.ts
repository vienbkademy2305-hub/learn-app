/**
 * Adapter for repos/hsk1-chinese-learning. The repo has NO license, so its data
 * is imported under a non-publishable source (DATA_MAPPING.md §1) and used only
 * for mapping and cross-checking.
 *
 * The data files are plain browser scripts declaring top-level consts; they are
 * evaluated in an isolated vm context without access to Node globals.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const HSK1_CL_FILES = {
  vocabulary: "js/vocabulary.js",
  sentences: "js/sentences.js",
} as const;

/** Real people's names found at the end of HSK1_VOCABULARY (REPO_AUDIT §0.4) — personal data, not vocabulary. */
export const EXCLUDED_PERSONAL_NAMES = new Set(["庞立亮", "卢氏芳"]);

export interface Hsk1Word {
  hanzi: string;
  pinyin: string;
  vietnamese: string;
  /** Position in the source array — used as source_record_id. */
  index: number;
}

export interface Hsk1Sentence {
  hanzi: string;
  pinyin: string;
  translation: string;
  courseId: string;
  courseTitle: string;
  recordId: string;
}

function evalConst<T>(file: string, name: string): T {
  const code = readFileSync(file, "utf8");
  return vm.runInNewContext(`${code}\n;${name}`, Object.create(null), { timeout: 1000 }) as T;
}

export function readVocabulary(file: string): { words: Hsk1Word[]; excluded: Hsk1Word[] } {
  const raw = evalConst<Array<Omit<Hsk1Word, "index">>>(file, "HSK1_VOCABULARY");
  const all = raw.map((w, index) => ({ ...w, index }));
  return {
    words: all.filter((w) => !EXCLUDED_PERSONAL_NAMES.has(w.hanzi)),
    excluded: all.filter((w) => EXCLUDED_PERSONAL_NAMES.has(w.hanzi)),
  };
}

export function readSentenceCourses(file: string): Hsk1Sentence[] {
  const courses = evalConst<
    Array<{ courseId: string; courseTitle: string; sentences: Array<{ hanzi: string; pinyin: string; translation: string }> }>
  >(file, "HSK1_SENTENCE_COURSES");
  return courses.flatMap((c) =>
    c.sentences.map((s, i) => ({
      ...s,
      courseId: c.courseId,
      courseTitle: c.courseTitle,
      recordId: `${c.courseId}#${i}`,
    })),
  );
}
