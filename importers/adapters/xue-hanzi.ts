/**
 * Adapter for repos/xue-hanzi. Reads ONLY third-party data files that the repo
 * vendors (CVDICT, Unihan kVietnamese, makemeahanzi) plus the author's small
 * Sino-Vietnamese override file. xue-hanzi's own build output
 * (public/data/dictionary.json) and code are not used — see DATA_MAPPING.md §1.
 */
import { readFileSync } from "node:fs";

export const XUE_HANZI_FILES = {
  cvdict: "src/data/CVDICT.u8",
  kVietnamese: "src/data/kVietnamese.json",
  sinoVietOverrides: "src/data/sinoViet-overrides.json",
  makemeahanzi: "src/data/makemeahanzi-dictionary.txt",
} as const;

export interface CvdictEntry {
  traditional: string;
  simplified: string;
  /** As written in the file, e.g. "ni3 hao3" or "Bei3 jing1". */
  pinyinNumbered: string;
  senses: string[];
  /** Stable natural key: the CEDICT headword "trad simp [pinyin]". */
  recordId: string;
}

const CEDICT_LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/;

export function parseCvdictLine(line: string): CvdictEntry | null {
  const m = CEDICT_LINE.exec(line);
  if (!m) return null;
  const [, traditional, simplified, pinyinNumbered, body] = m as unknown as [string, string, string, string, string];
  return {
    traditional,
    simplified,
    pinyinNumbered,
    senses: body.split("/").map((s) => s.trim()).filter(Boolean),
    recordId: `${traditional} ${simplified} [${pinyinNumbered}]`,
  };
}

export function readCvdict(file: string): { entries: CvdictEntry[]; unparsed: string[] } {
  const entries: CvdictEntry[] = [];
  const unparsed: string[] = [];
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!raw || raw.startsWith("#")) continue;
    const entry = parseCvdictLine(raw);
    if (entry) entries.push(entry);
    else unparsed.push(raw);
  }
  return { entries, unparsed };
}

/** { "学": ["học"] } — Unihan kVietnamese as converted by xue-hanzi. */
export function readSinoVietMap(file: string): Record<string, string[]> {
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, string[]>;
}

export interface MakemeahanziEntry {
  character: string;
  definition?: string;
  pinyin?: string[];
  decomposition?: string;
  radical?: string;
  etymology?: { type: string; hint?: string; semantic?: string; phonetic?: string };
}

export function readMakemeahanzi(file: string): Map<string, MakemeahanziEntry> {
  const map = new Map<string, MakemeahanziEntry>();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as MakemeahanziEntry;
    map.set(entry.character, entry);
  }
  return map;
}
