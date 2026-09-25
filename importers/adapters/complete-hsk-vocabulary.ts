/**
 * Adapter for drkameleon/complete-hsk-vocabulary (MIT), downloaded by
 * `pnpm sources:fetch` into sources/raw/. Schema verified on new/1.json.
 */
import { readFileSync } from "node:fs";

export const HSK_LIST_FILE = (level: number) => `wordlists/exclusive/new/${level}.json`;

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
