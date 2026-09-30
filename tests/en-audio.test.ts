import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnglish } from "../importers/en/load";

// docs/EN_AUDIO_PLAN.md: files are built locally by `pnpm en:audio` (public/assets is not in git),
// so this check only runs on a machine that has generated them.
const DIR = path.resolve(import.meta.dirname, "..", "public", "assets", "en-audio");
const MANIFEST = path.join(DIR, "manifest.json");
// Opt-in while generation is still running: EN_AUDIO_CHECK=1 pnpm vitest run tests/en-audio.test.ts
const full = existsSync(MANIFEST) && process.env.EN_AUDIO_CHECK === "1";

describe.skipIf(!full)("English audio files", () => {
  const items: Record<string, { n: string; s?: string }> = full ? JSON.parse(readFileSync(MANIFEST, "utf8")).items : {};
  const data = loadEnglish();
  const listening = [
    ...data.lessons.flatMap((l) => l.steps.flatMap((s) => (s.type === "exercises" ? s.items : []))),
    ...data.tests.flatMap((t) => t.sections.flatMap((s) => s.exercises)),
  ].flatMap((x) => [x.audio_text, x.kind === "dictation" ? x.text : undefined]).filter((t): t is string => !!t);

  it("every listening text and dictation has a normal and a slow recording", () => {
    const missing = listening.filter((t) => !items[t]?.n || !items[t]?.s);
    expect(missing.map((t) => t.slice(0, 60))).toEqual([]);
  });

  it("every word and example sentence has a recording", () => {
    const texts = [...data.lexicon.map((e) => e.headword), ...data.sentences.map((s) => s.text)];
    expect(texts.filter((t) => !items[t]).slice(0, 20)).toEqual([]);
  });

  it("every file in the manifest exists", () => {
    const files = Object.values(items).flatMap((e) => [e.n, e.s]).filter((f): f is string => !!f);
    expect(files.filter((f) => !existsSync(path.join(DIR, f)))).toEqual([]);
  });
});
