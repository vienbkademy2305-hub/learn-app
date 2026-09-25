/**
 * Persists a CanonicalGraph into a fresh database and copies audio files into
 * the local asset store (.data/assets), separate from the source repositories.
 * PHASE 1 rebuilds the content schema from scratch on every run; incremental
 * upserts with diff reports (ARCHITECTURE §21) come with the first release.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { migrateDb, openDb, PROJECT_ROOT, type Db } from "../../src/db/client";
import * as t from "../../src/db/schema";
import { SOURCES, sourceVersion } from "../lib/catalog";
import { sha256File, type Manifest } from "../lib/manifest";
import type { CanonicalGraph } from "./graph";

export const ASSETS_DIR = path.join(PROJECT_ROOT, ".data", "assets");

async function insertChunked<T extends object>(db: Db, table: Parameters<Db["insert"]>[0], rows: T[]) {
  for (let i = 0; i < rows.length; i += 500) {
    // Rows come from the typed graph; the generic table parameter loses the per-table insert type.
    await db.insert(table).values(rows.slice(i, i + 500) as never);
  }
}

export function copyAudio(g: CanonicalGraph): { copied: number } {
  let copied = 0;
  for (const a of g.audio) {
    const target = path.join(ASSETS_DIR, a.storageKey);
    mkdirSync(path.dirname(target), { recursive: true });
    const sourceHash = sha256File(a.sourcePath);
    if (!existsSync(target) || sha256File(target) !== sourceHash) {
      copyFileSync(a.sourcePath, target);
      copied++;
    }
    a.sha256 = sourceHash;
  }
  return { copied };
}

export async function writeGraph(g: CanonicalGraph, manifest: Manifest, run: { scope: string; startedAt: Date; stats: unknown }, dbDir: string) {
  rmSync(dbDir, { recursive: true, force: true });
  const { client, db } = await openDb(dbDir);
  try {
    await migrateDb(db);

    await insertChunked(db, t.sources, SOURCES.map((s) => ({ id: s.id, name: s.name, url: s.url, license: s.license, publishable: s.publishable, via: s.via ?? null, notes: s.notes ?? null })));
    const versionRows = SOURCES.map((s, i) => ({ id: i + 1, sourceId: s.id, ...sourceVersion(s, manifest), fetchedAt: run.startedAt }));
    await insertChunked(db, t.sourceVersions, versionRows);
    const versionBySource = new Map(versionRows.map((v) => [v.sourceId, v.id]));

    await insertChunked(db, t.characters, [...g.characters.values()]);
    await insertChunked(db, t.characterReadings, g.characterReadings);
    await insertChunked(db, t.characterSinoViet, g.characterSinoViet);
    await insertChunked(db, t.words, [...g.words.values()]);
    await insertChunked(db, t.wordCharacters, g.wordCharacters);
    await insertChunked(db, t.wordSenses, g.wordSenses);
    await insertChunked(db, t.sentences, [...g.sentences.values()]);
    await insertChunked(db, t.sentenceTokens, g.tokens);
    await insertChunked(db, t.sentenceTranslations, g.translations);
    await insertChunked(db, t.grammarPoints, [...g.grammar.values()]);
    await insertChunked(db, t.sentenceGrammar, [...g.sentenceGrammar.values()]);
    await insertChunked(db, t.audioAssets, g.audio.map(({ sourcePath: _sourcePath, ...row }) => row));
    await insertChunked(db, t.lessons, g.lessons);
    await insertChunked(db, t.lessonSteps, g.lessonSteps);
    await insertChunked(db, t.lessonStepItems, g.lessonStepItems);
    await insertChunked(db, t.hskAssignments, [...g.hsk.values()]);
    await insertChunked(db, t.entitySources, [...g.entitySources.values()].map((s) => ({ ...s, sourceVersionId: versionBySource.get(s.sourceId) ?? null })));
    await insertChunked(db, t.reviewQueue, g.reviewQueue);
    await db.insert(t.importRuns).values({ id: 1, scope: run.scope, startedAt: run.startedAt, finishedAt: new Date(), stats: run.stats });
  } finally {
    await client.close();
  }
}
