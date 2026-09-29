/**
 * English content snapshot for the static site (docs/ENGLISH_SPLIT_PLAN.md §3):
 * data/en/*.yaml → .data/content/en.json. Refuses to export while `en:validate` has errors,
 * and leaves out retired items. Run: pnpm content:export:en
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EnContentSnapshot, EnWord } from "../../src/content/en-types";
import { firstLesson, loadEnglish, validateEnglish } from "./load";

const CONTENT_DIR = path.resolve(import.meta.dirname, "..", "..", ".data", "content");

/** URL-safe, stable slug for a lexicon id: `look-like|phr-v` → `look-like--phr-v`. */
export const wordSlug = (id: string) => id.replace(/'/g, "").replace("|", "--");

function strip<T extends { file: string }>(item: T): Omit<T, "file"> {
  const { file: _file, ...rest } = item;
  return rest;
}

export function buildEnSnapshot(): EnContentSnapshot {
  const data = loadEnglish();
  const { errors } = validateEnglish(data);
  if (errors.length) throw new Error(`en:validate has ${errors.length} error(s) — fix them first:\n  ${errors.slice(0, 10).join("\n  ")}`);

  const live = <T extends { status: string }>(items: T[]) => items.filter((i) => i.status !== "retired");
  const first = firstLesson(data);
  const slugs = new Map<string, string>();
  const words: Record<string, EnWord> = {};
  for (const e of live(data.lexicon)) {
    const slug = wordSlug(e.id);
    if (slugs.has(slug)) throw new Error(`word slug ${slug} used by ${slugs.get(slug)} and ${e.id}`);
    slugs.set(slug, e.id);
    words[e.id] = { ...strip(e), slug, lesson: first.get(e.id) ?? null };
  }
  const sentences = Object.fromEntries(live(data.sentences).map((s) => [s.id, strip(s)]));
  const grammar = Object.fromEntries(live(data.grammar).map((g) => [g.id, strip(g)]));
  const sounds = Object.fromEntries(data.sounds.map((s) => [s.id, strip(s)]));
  const lessons = live(data.lessons).map((l) => strip(l));
  const tests = live(data.tests).map((t) => strip(t));
  const publishable = data.sources.filter((s) => s.publishable).map((s) => ({ id: s.id, name: s.name, license: s.license, url: s.url ?? null }));

  return { generatedAt: new Date().toISOString(), lessons, tests, words, sentences, grammar, sounds, sources: publishable };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const snapshot = buildEnSnapshot();
  mkdirSync(CONTENT_DIR, { recursive: true });
  const file = path.join(CONTENT_DIR, "en.json");
  writeFileSync(file, JSON.stringify(snapshot));
  console.log(`${path.relative(process.cwd(), file)}: ${snapshot.lessons.length} buổi, ${Object.keys(snapshot.words).length} từ, ${Object.keys(snapshot.sentences).length} câu, ${Object.keys(snapshot.grammar).length} điểm ngữ pháp`);
}
