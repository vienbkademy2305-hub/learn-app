/**
 * Role-play dialogues of the HSK1 lessons (data/editorial/dialogues/hsk1.yaml, editorial draft).
 * Read at build time, like the content snapshot.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export type ZhDialogueLine = { speaker: string; text: string; pinyin: string; vi: string };
type Raw = { status?: string; lessons: Record<string, Array<{ s: string; zh: string; py: string; vi: string }>> };

let cache: Record<string, ZhDialogueLine[]> | undefined;

export function zhDialogues(): Record<string, ZhDialogueLine[]> {
  if (!cache) {
    const raw = parse(readFileSync(path.join(process.cwd(), "data", "editorial", "dialogues", "hsk1.yaml"), "utf8")) as Raw;
    cache = Object.fromEntries(
      Object.entries(raw.lessons ?? {}).map(([slug, lines]) => [slug, lines.map((l) => ({ speaker: String(l.s), text: String(l.zh), pinyin: String(l.py), vi: String(l.vi) }))]),
    );
  }
  return cache;
}

export const zhDialogue = (slug: string): ZhDialogueLine[] => zhDialogues()[slug] ?? [];
