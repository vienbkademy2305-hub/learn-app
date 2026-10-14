/**
 * Server-side access to the content snapshot (build time only for the static
 * export). Generate it with `pnpm import:hsk3 && pnpm content:export` (all levels up to 3).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ContentSnapshot, GrammarData, LessonData, SentenceData, WordData } from "./types";

let cache: ContentSnapshot | undefined;

export function content(): ContentSnapshot {
  if (!cache) {
    const dir = path.join(process.cwd(), ".data", "content");
    const file = path.join(dir, "zh.json");
    try {
      cache = JSON.parse(readFileSync(file, "utf8")) as ContentSnapshot;
    } catch {
      try {
        cache = JSON.parse(readFileSync(path.join(dir, "hsk1.json"), "utf8")) as ContentSnapshot; // older single-level snapshot
      } catch (err) {
        throw new Error(`Content snapshot not found at ${file}. Run \`pnpm import:hsk3 && pnpm content:export\` first.`, { cause: err });
      }
    }
  }
  return cache;
}

export function getLessons(): LessonData[] {
  return content().lessons;
}

/** HSK levels that have lessons, ascending ("1", "2", …). */
export function getLevels(): string[] {
  return content().levels ?? [content().level];
}

/** 1-based position of a lesson across all levels — a unique number for the word games (lesson numbers restart per level). */
export function lessonOrdinal(slug: string): number {
  return content().lessons.findIndex((l) => l.slug === slug) + 1;
}

export function lessonsOfLevel(level: string): LessonData[] {
  return content().lessons.filter((l) => l.hskLevel === level);
}

export function getLesson(slug: string): LessonData | undefined {
  return content().lessons.find((l) => l.slug === slug);
}

export function lessonNeighbors(slug: string): { prev: LessonData | null; next: LessonData | null } {
  const lessons = content().lessons;
  const i = lessons.findIndex((l) => l.slug === slug);
  return { prev: lessons[i - 1] ?? null, next: lessons[i + 1] ?? null };
}

export function getWord(slug: string): WordData | undefined {
  return content().words[slug];
}

export function getSentence(key: string): SentenceData | undefined {
  return content().sentences[key];
}

/** Grammar points of a lesson, in teaching order (empty for snapshots without grammar). */
export function lessonGrammar(slug: string): GrammarData[] {
  const all = content().grammar ?? {};
  return (getLesson(slug)?.grammar ?? []).map((id) => all[id]).filter((g) => g !== undefined);
}

export function allWordSlugs(): string[] {
  return Object.keys(content().words);
}
