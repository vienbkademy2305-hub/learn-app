/**
 * Adapter for drkameleon/complete-hsk-vocabulary (MIT), downloaded by
 * `pnpm sources:fetch` into sources/raw/. Schema verified on new/1.json.
 */
import { readFileSync } from "node:fs";

export const HSK_LIST_FILE = (level: number) => `wordlists/exclusive/new/${level}.json`;
/** Word lists of the 2025 exam syllabus (HSK 考试大纲, CLEC 2025-11, used by the exam from 2026-12): "newest" in the repo. */
export const HSK_EXAM_LIST_FILE = (level: number) => `wordlists/exclusive/newest/${level}.json`;
/** Levels of the exam syllabus imported so far (the app teaches up to HSK3). */
export const EXAM_LEVELS = 3;

export interface HskListForm {
  traditional: string;
  transcriptions: { pinyin: string; numeric: string };
  meanings: string[];
}

export interface HskListItem {
  simplified: string;
  radical: string;
  frequency: number;
  pos: string[];
  forms: HskListForm[];
}

export function readHskList(file: string): HskListItem[] {
  return JSON.parse(readFileSync(file, "utf8")) as HskListItem[];
}
