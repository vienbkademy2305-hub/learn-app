/**
 * Editorial Vietnamese grammar (data/editorial/grammar-vi/hsk{level}.yaml, docs/PHASE5_GRAMMAR_PLAN.md).
 * Self-written content (source `editorial`); merged into the content snapshot at export time.
 * Every lesson slug and example sentence key must exist in the snapshot.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { ContentSnapshot, GrammarData } from "../../src/content/types";
import { PROJECT_ROOT } from "../../src/db/client";

interface RawPoint {
  id: string;
  lesson: string;
  hsk_code?: string | null;
  status?: string;
  title: string;
  structures?: string[];
  explain: string;
  notes?: string[];
  mistakes?: Array<{ wrong: string; right: string; why: string }>;
  examples?: string[];
}

export function grammarFile(level: string): string {
  return path.join(PROJECT_ROOT, "data", "editorial", "grammar-vi", `hsk${level}.yaml`);
}

/** Parses and validates the grammar file; returns points in file order. Throws listing every problem. */
export function readGrammar(text: string, snapshot: Pick<ContentSnapshot, "lessons" | "sentences">): GrammarData[] {
  const doc = YAML.parse(text) as { default_status?: string; points?: RawPoint[] };
  const lessons = new Set(snapshot.lessons.map((l) => l.slug));
  const problems: string[] = [];
  const seen = new Set<string>();
  const points: GrammarData[] = [];
  for (const p of doc.points ?? []) {
    if (!p.id || seen.has(p.id)) problems.push(`duplicate or missing id: ${p.id}`);
    seen.add(p.id);
    if (!lessons.has(p.lesson)) problems.push(`${p.id}: unknown lesson ${p.lesson}`);
    for (const key of p.examples ?? []) if (!snapshot.sentences[key]) problems.push(`${p.id}: unknown sentence ${key}`);
    for (const m of p.mistakes ?? []) if (!m.wrong || !m.right || m.wrong === m.right) problems.push(`${p.id}: bad mistake pair`);
    points.push({
      id: p.id,
      lesson: p.lesson,
      title: p.title,
      structures: p.structures ?? [],
      explain: p.explain.trim(),
      notes: p.notes ?? [],
      mistakes: p.mistakes ?? [],
      examples: p.examples ?? [],
      draft: (p.status ?? doc.default_status ?? "draft") !== "reviewed",
    });
  }
  if (problems.length) throw new Error(`grammar-vi: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
  return points;
}

/** Adds `grammar` and each lesson's grammar ids to the snapshot (no-op when the level has no file). */
export function attachGrammar(snapshot: ContentSnapshot, level: string): number {
  const file = grammarFile(level);
  if (!existsSync(file)) return 0;
  const points = readGrammar(readFileSync(file, "utf8"), snapshot);
  snapshot.grammar = Object.fromEntries(points.map((p) => [p.id, p]));
  for (const lesson of snapshot.lessons) lesson.grammar = points.filter((p) => p.lesson === lesson.slug).map((p) => p.id);
  return points.length;
}
