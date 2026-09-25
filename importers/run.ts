/**
 * PHASE 1 import: `pnpm import:hsk1` (= tsx importers/run.ts --level 1).
 * Verifies pinned inputs, builds the canonical graph, (re)generates lesson
 * drafts, writes the local database and copies audio assets.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_DB_DIR, PROJECT_ROOT } from "../src/db/client";
import { HSK_LIST_FILE, readHskList } from "./adapters/complete-hsk-vocabulary";
import { HSK_SENTENCES_FILES, readGrammarPoints, readReviewFlags, readSentences } from "./adapters/hsk-sentences-audio";
import { HSK1_CL_FILES, readSentenceCourses, readVocabulary } from "./adapters/hsk1-chinese-learning";
import { readCvdict, readMakemeahanzi, readSinoVietMap, XUE_HANZI_FILES } from "./adapters/xue-hanzi";
import { generateLessonDrafts, loadLessons } from "./build/lessons";
import { buildGraph, type PipelineInputs } from "./build/pipeline";
import { copyAudio, writeGraph } from "./build/write";
import { downloadPath, loadManifest, repoPath, verifyInputs, type Manifest } from "./lib/manifest";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

export function loadInputs(manifest: Manifest, maxLevel: number): PipelineInputs & { cvdictUnparsed: number; excludedNames: string[] } {
  const xue = (f: string) => repoPath(manifest, "xue-hanzi", f);
  const hsa = (f: string) => repoPath(manifest, "hsk-sentences-audio", f);
  const h1 = (f: string) => repoPath(manifest, "hsk1-chinese-learning", f);
  const hskPin = manifest.downloads["complete-hsk-vocabulary"]!;

  const cvdict = readCvdict(xue(XUE_HANZI_FILES.cvdict));
  const vocab = readVocabulary(h1(HSK1_CL_FILES.vocabulary));
  return {
    cvdict: cvdict.entries,
    cvdictUnparsed: cvdict.unparsed.length,
    sinoViet: readSinoVietMap(xue(XUE_HANZI_FILES.kVietnamese)),
    sinoVietOverrides: readSinoVietMap(xue(XUE_HANZI_FILES.sinoVietOverrides)),
    makemeahanzi: readMakemeahanzi(xue(XUE_HANZI_FILES.makemeahanzi)),
    hskLists: Array.from({ length: maxLevel }, (_, i) => readHskList(downloadPath("complete-hsk-vocabulary", hskPin.commit, HSK_LIST_FILE(i + 1)))),
    hskSentences: readSentences(hsa(HSK_SENTENCES_FILES.sentences)),
    grammarPoints: readGrammarPoints(hsa(HSK_SENTENCES_FILES.grammar)),
    reviewFlags: readReviewFlags(hsa(HSK_SENTENCES_FILES.reviewFlags)),
    audioBaseDir: hsa(HSK_SENTENCES_FILES.audioDir),
    hsk1Words: maxLevel >= 1 ? vocab.words : [],
    excludedNames: vocab.excluded.map((w) => w.hanzi),
    hsk1Sentences: maxLevel >= 1 ? readSentenceCourses(h1(HSK1_CL_FILES.sentences)) : [],
  };
}

async function main() {
  const level = Number(arg("level", "1"));
  const dbDir = arg("db", DEFAULT_DB_DIR);
  const startedAt = new Date();

  const manifest = loadManifest();
  verifyInputs(manifest);
  const inputs = loadInputs(manifest, level);

  const { graph, stats } = buildGraph(inputs, level);
  stats.cvdict_lines = inputs.cvdict.length;
  stats.cvdict_unparsed_lines = inputs.cvdictUnparsed;
  stats.hsk1_cl_excluded_personal_names = inputs.excludedNames;

  const lessonDir = path.join(PROJECT_ROOT, "data", "editorial", "lessons", `hsk${level}`);
  const drafts = generateLessonDrafts(graph, level, lessonDir);
  const lessons = loadLessons(graph, lessonDir);
  stats.lesson_drafts_written = drafts.written.length;
  stats.lesson_files_kept = drafts.kept.length;
  stats.lessons = lessons.lessons;
  stats.lesson_items = lessons.items;
  stats.lesson_unresolved_refs = lessons.unresolvedRefs;

  const audio = copyAudio(graph);
  stats.audio_files_copied = audio.copied;
  stats.review_queue = graph.reviewQueue.length;
  stats.provenance_conflicts = graph.provenanceConflicts;

  await writeGraph(graph, manifest, { scope: `hsk1-${level}`, startedAt, stats }, dbDir);

  const reportsDir = path.join(PROJECT_ROOT, "reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(path.join(reportsDir, `import-hsk${level}-stats.json`), `${JSON.stringify(stats, null, 2)}\n`);
  console.log(JSON.stringify(stats, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main();
}
