/**
 * Role-play dialogues of the HSK lessons (data/editorial/dialogues/hsk<level>.yaml, editorial drafts).
 * Read at build time, like the content snapshot.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export type ZhDialogueLine = { speaker: string; text: string; pinyin: string; vi: string };
type Raw = { status?: string; lessons: Record<string, Array<{ s: string; zh: string; py: string; vi: string }>> };

let cache: Record<string, ZhDialogueLine[]> | undefined;

export function zhDialogues(): Record<string, ZhDialogueLine[]> {
  if (!cache) {
    const dir = path.join(process.cwd(), "data", "editorial", "dialogues");
    cache = {};
    for (const file of readdirSync(dir).filter((f) => /^hsk\d+\.yaml$/.test(f)).sort()) {
      const raw = parse(readFileSync(path.join(dir, file), "utf8")) as Raw;
      for (const [slug, lines] of Object.entries(raw.lessons ?? {}))
        cache[slug] = lines.map((l) => ({ speaker: String(l.s), text: String(l.zh), pinyin: String(l.py), vi: String(l.vi) }));
    }
  }
  return cache;
}

export const zhDialogue = (slug: string): ZhDialogueLine[] => zhDialogues()[slug] ?? [];
