/**
 * Server-side access to the content snapshot (build time only for the static
 * export). Generate it with `pnpm import:hsk1 && pnpm content:export`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ContentSnapshot, LessonData, SentenceData, WordData } from "./types";

let cache: ContentSnapshot | undefined;

export function content(): ContentSnapshot {
  if (!cache) {
    const file = path.join(process.cwd(), ".data", "content", "hsk1.json");
    try {
      cache = JSON.parse(readFileSync(file, "utf8")) as ContentSnapshot;
    } catch (err) {
      throw new Error(`Content snapshot not found at ${file}. Run \`pnpm import:hsk1 && pnpm content:export\` first.`, { cause: err });
    }
  }
  return cache;
}

export function getLessons(): LessonData[] {
  return content().lessons;
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

export function allWordSlugs(): string[] {
  return Object.keys(content().words);
}
