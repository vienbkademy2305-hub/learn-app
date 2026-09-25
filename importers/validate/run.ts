/**
 * PHASE 1 validation (docs/DATA_MAPPING.md §4): `pnpm validate`.
 * Errors fail the run (exit 1); warnings are listed in reports/phase1-validation.md.
 */
import type { PGlite } from "@electric-sql/pglite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_DB_DIR, openDb, PROJECT_ROOT } from "../../src/db/client";
import { sha256File } from "../lib/manifest";
import { ASSETS_DIR } from "../build/write";

export interface Check {
  id: string;
  title: string;
  severity: "error" | "warning";
  rows: Record<string, unknown>[];
}

async function q(client: PGlite, sql: string): Promise<Record<string, unknown>[]> {
  return (await client.query<Record<string, unknown>>(sql)).rows;
}

/** Entity types that must always carry at least one provenance row. */
const TRACEABLE: Array<[string, string]> = [
  ["character", "content.characters"],
  ["word", "content.words"],
  ["sentence", "content.sentences"],
  ["grammar", "content.grammar_points"],
  ["lesson", "content.lessons"],
];

export async function runChecks(client: PGlite): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (id: string, title: string, severity: Check["severity"], rows: Record<string, unknown>[]) =>
    checks.push({ id, title, severity, rows });

  // ── Duplicates ────────────────────────────────────────────────────────────
  add("duplicate_character", "Duplicate character (NFC hanzi)", "error", await q(client, `
    SELECT normalize(hanzi, NFC) AS hanzi, count(*)::int AS n FROM content.characters
    GROUP BY 1 HAVING count(*) > 1`));
  add("duplicate_word", "Duplicate word (simplified + pinyin key)", "error", await q(client, `
    SELECT simplified, pinyin_key, count(*)::int AS n FROM content.words
    GROUP BY 1, 2 HAVING count(*) > 1`));
  add("duplicate_word_marked", "Duplicate word (simplified + tone-marked pinyin, case-insensitive)", "error", await q(client, `
    SELECT simplified, lower(pinyin_marked) AS pinyin, count(*)::int AS n FROM content.words
    GROUP BY 1, 2 HAVING count(*) > 1`));
  add("duplicate_sentence", "Duplicate sentence (content hash)", "error", await q(client, `
    SELECT content_hash, count(*)::int AS n FROM content.sentences GROUP BY 1 HAVING count(*) > 1`));
  add("duplicate_sentence_text", "Duplicate sentence (identical text)", "error", await q(client, `
    SELECT simplified, count(*)::int AS n FROM content.sentences GROUP BY 1 HAVING count(*) > 1`));

  // ── Provenance & references ──────────────────────────────────────────────
  for (const [type, table] of TRACEABLE) {
    add(`missing_provenance_${type}`, `${type} without source/source_id`, "error", await q(client, `
      SELECT e.id FROM ${table} e
      WHERE NOT EXISTS (SELECT 1 FROM content.entity_sources s WHERE s.entity_type = '${type}' AND s.entity_id = e.id)`));
  }
  add("dangling_lesson_item", "Lesson item pointing to a missing entity", "error", await q(client, `
    SELECT i.step_id, i.sort, i.entity_type, i.entity_id FROM content.lesson_step_items i
    WHERE (i.entity_type = 'word' AND NOT EXISTS (SELECT 1 FROM content.words w WHERE w.id = i.entity_id))
       OR (i.entity_type = 'sentence' AND NOT EXISTS (SELECT 1 FROM content.sentences s WHERE s.id = i.entity_id))`));
  add("unresolved_lesson_ref", "Lesson reference that could not be resolved", "error", await q(client, `
    SELECT detail->>'ref' AS ref FROM content.review_queue WHERE issue = 'unresolved_lesson_ref'`));

  // ── Audio ────────────────────────────────────────────────────────────────
  const audio = await q(client, `
    SELECT a.id, a.storage_key, a.sha256, a.owner_id, (s.id IS NULL) AS orphan
    FROM content.audio_assets a LEFT JOIN content.sentences s ON a.owner_type = 'sentence' AND s.id = a.owner_id`);
  const broken: Record<string, unknown>[] = [];
  for (const a of audio) {
    const file = path.join(ASSETS_DIR, String(a.storage_key));
    if (a.orphan) broken.push({ storage_key: a.storage_key, problem: "owner sentence missing" });
    else if (!existsSync(file)) broken.push({ storage_key: a.storage_key, problem: "file missing in asset store" });
    else if (sha256File(file) !== a.sha256) broken.push({ storage_key: a.storage_key, problem: "sha256 mismatch" });
  }
  add("broken_audio_reference", "Broken audio reference", "error", broken);
  add("sentence_missing_audio_speed", "hsk-sentences-audio sentence without normal+slow audio", "error", await q(client, `
    SELECT s.id, es.source_record_id FROM content.sentences s
    JOIN content.entity_sources es ON es.entity_type = 'sentence' AND es.entity_id = s.id AND es.source_id = 'hsk-sentences-audio' AND es.role = 'primary'
    WHERE (SELECT count(DISTINCT speed) FROM content.audio_assets a WHERE a.owner_type = 'sentence' AND a.owner_id = s.id) < 2`));

  // ── Missing pinyin ───────────────────────────────────────────────────────
  add("missing_pinyin_character", "Character without pinyin reading", "warning", await q(client, `
    SELECT c.hanzi FROM content.characters c
    WHERE NOT EXISTS (SELECT 1 FROM content.character_readings r WHERE r.character_id = c.id)`));
  add("missing_pinyin_word", "Word without pinyin", "error", await q(client, `
    SELECT simplified FROM content.words WHERE coalesce(pinyin_numbered, '') = '' OR coalesce(pinyin_marked, '') = ''`));
  add("missing_pinyin_sentence", "Sentence without pinyin", "warning", await q(client, `
    SELECT id, simplified FROM content.sentences WHERE coalesce(pinyin_marked, '') = ''`));

  // ── Missing Vietnamese ───────────────────────────────────────────────────
  add("missing_vi_curriculum_word", "Curriculum word without a publishable Vietnamese meaning", "warning", await q(client, `
    SELECT w.simplified, w.pinyin_marked FROM content.words w WHERE w.in_curriculum
      AND NOT EXISTS (SELECT 1 FROM content.word_senses ws JOIN content.sources src ON src.id = ws.source_id
                      WHERE ws.word_id = w.id AND ws.lang = 'vi' AND src.publishable)`));
  add("missing_vi_curriculum_word_any", "Curriculum word without any Vietnamese meaning (incl. non-publishable)", "warning", await q(client, `
    SELECT w.simplified, w.pinyin_marked FROM content.words w WHERE w.in_curriculum
      AND NOT EXISTS (SELECT 1 FROM content.word_senses ws WHERE ws.word_id = w.id AND ws.lang = 'vi')`));
  add("missing_vi_sentence", "Sentence without a publishable Vietnamese translation", "warning", await q(client, `
    SELECT s.id, s.simplified FROM content.sentences s
    WHERE NOT EXISTS (SELECT 1 FROM content.sentence_translations t JOIN content.sources src ON src.id = t.source_id
                      WHERE t.sentence_id = s.id AND t.lang = 'vi' AND src.publishable)`));
  add("missing_sino_viet_character", "Character without Sino-Vietnamese reading", "warning", await q(client, `
    SELECT c.hanzi FROM content.characters c
    WHERE NOT EXISTS (SELECT 1 FROM content.character_sino_viet v WHERE v.character_id = c.id)`));

  // ── Missing HSK level ────────────────────────────────────────────────────
  add("missing_hsk_curriculum_word", "Curriculum word without HSK level", "error", await q(client, `
    SELECT w.simplified FROM content.words w WHERE w.in_curriculum
      AND NOT EXISTS (SELECT 1 FROM content.hsk_assignments h WHERE h.entity_type = 'word' AND h.entity_id = w.id)`));
  add("missing_hsk_sentence", "Sentence without HSK level", "warning", await q(client, `
    SELECT s.id, s.simplified, (SELECT string_agg(source_id, ',') FROM content.entity_sources es
                                WHERE es.entity_type = 'sentence' AND es.entity_id = s.id) AS sources
    FROM content.sentences s
    WHERE NOT EXISTS (SELECT 1 FROM content.hsk_assignments h WHERE h.entity_type = 'sentence' AND h.entity_id = s.id)`));
  add("missing_hsk_grammar", "Grammar point without HSK level", "error", await q(client, `
    SELECT g.code FROM content.grammar_points g
    WHERE NOT EXISTS (SELECT 1 FROM content.hsk_assignments h WHERE h.entity_type = 'grammar' AND h.entity_id = g.id)`));
  add("missing_hsk_character", "Character of a curriculum word without derived HSK level", "error", await q(client, `
    SELECT DISTINCT c.hanzi FROM content.characters c
    JOIN content.word_characters wc ON wc.character_id = c.id JOIN content.words w ON w.id = wc.word_id AND w.in_curriculum
    WHERE NOT EXISTS (SELECT 1 FROM content.hsk_assignments h WHERE h.entity_type = 'character' AND h.entity_id = c.id)`));

  // ── Mapping gaps (informational) ─────────────────────────────────────────
  add("unmatched_token", "Sentence token not mapped to a word", "warning", await q(client, `
    SELECT detail->>'surface' AS surface, detail->>'pinyin' AS pinyin, detail->>'reason' AS reason, detail->>'occurrences' AS occurrences
    FROM content.review_queue WHERE issue = 'unmatched_token'`));
  add("hsk_reading_ambiguous", "HSK list item with several possible readings (all kept)", "warning", await q(client, `
    SELECT detail->>'simplified' AS simplified, detail->'readings' AS readings FROM content.review_queue WHERE issue = 'hsk_reading_ambiguous'`));
  add("unmatched_hsk1_cl_word", "hsk1-chinese-learning word not mapped", "warning", await q(client, `
    SELECT detail->>'hanzi' AS hanzi, detail->>'pinyin' AS pinyin, detail->>'reason' AS reason FROM content.review_queue WHERE issue = 'unmatched_hsk1_cl_word'`));

  return checks;
}

export async function mappingSummary(client: PGlite): Promise<Record<string, unknown>[]> {
  return q(client, `
    SELECT 'words linked to characters' AS metric,
           (SELECT count(DISTINCT word_id) FROM content.word_characters)::text || ' / ' || (SELECT count(*) FROM content.words)::text AS value
    UNION ALL SELECT 'tokens mapped to words',
           (SELECT count(*) FROM content.sentence_tokens WHERE word_id IS NOT NULL)::text || ' / ' || (SELECT count(*) FROM content.sentence_tokens WHERE resolution NOT IN ('punct','non_han'))::text
    UNION ALL SELECT 'sentences with every token mapped',
           (SELECT count(*) FROM content.sentences s WHERE EXISTS (SELECT 1 FROM content.sentence_tokens t WHERE t.sentence_id = s.id)
              AND NOT EXISTS (SELECT 1 FROM content.sentence_tokens t WHERE t.sentence_id = s.id AND t.resolution = 'unresolved'))::text
           || ' / ' || (SELECT count(DISTINCT sentence_id) FROM content.sentence_tokens)::text
    UNION ALL SELECT 'sentences linked to grammar points',
           (SELECT count(DISTINCT sentence_id) FROM content.sentence_grammar)::text || ' / ' || (SELECT count(*) FROM content.sentences)::text
    UNION ALL SELECT 'lessons → items (words / sentences)',
           (SELECT count(*) FROM content.lessons)::text || ' → ' ||
           (SELECT count(*) FROM content.lesson_step_items WHERE entity_type = 'word')::text || ' / ' ||
           (SELECT count(*) FROM content.lesson_step_items WHERE entity_type = 'sentence')::text
    UNION ALL SELECT 'curriculum words used in a lesson',
           (SELECT count(DISTINCT entity_id) FROM content.lesson_step_items WHERE entity_type = 'word')::text || ' / ' ||
           (SELECT count(*) FROM content.words WHERE in_curriculum)::text
    UNION ALL SELECT 'HSK assignments (character / word / sentence / grammar / lesson)',
           string_agg(n::text, ' / ' ORDER BY ord) FROM (
             SELECT CASE entity_type WHEN 'character' THEN 1 WHEN 'word' THEN 2 WHEN 'sentence' THEN 3 WHEN 'grammar' THEN 4 ELSE 5 END AS ord, count(*) AS n
             FROM content.hsk_assignments GROUP BY entity_type) x`);
}

async function main() {
  const { client } = await openDb(DEFAULT_DB_DIR);
  try {
    const checks = await runChecks(client);
    const summary = await mappingSummary(client);
    const counts = await q(client, `
      SELECT 'characters' AS entity, count(*)::int AS n FROM content.characters
      UNION ALL SELECT 'words', count(*)::int FROM content.words
      UNION ALL SELECT 'words (curriculum)', count(*)::int FROM content.words WHERE in_curriculum
      UNION ALL SELECT 'word senses', count(*)::int FROM content.word_senses
      UNION ALL SELECT 'sentences', count(*)::int FROM content.sentences
      UNION ALL SELECT 'sentence tokens', count(*)::int FROM content.sentence_tokens
      UNION ALL SELECT 'sentence translations', count(*)::int FROM content.sentence_translations
      UNION ALL SELECT 'grammar points', count(*)::int FROM content.grammar_points
      UNION ALL SELECT 'audio assets', count(*)::int FROM content.audio_assets
      UNION ALL SELECT 'lessons', count(*)::int FROM content.lessons
      UNION ALL SELECT 'entity_sources', count(*)::int FROM content.entity_sources
      UNION ALL SELECT 'review_queue', count(*)::int FROM content.review_queue`);
    const bySource = await q(client, `
      SELECT source_id, entity_type, count(*)::int AS n FROM content.entity_sources GROUP BY 1, 2 ORDER BY 1, 2`);

    const errors = checks.filter((c) => c.severity === "error" && c.rows.length > 0);
    const md: string[] = [
      "# PHASE 1 — Validation report",
      "",
      `- Generated: ${new Date().toISOString()} by \`pnpm validate\``,
      `- Result: **${errors.length === 0 ? "PASS" : `FAIL (${errors.length} error checks)`}**`,
      "",
      "## Entity counts",
      "",
      "| Entity | Count |",
      "|---|---|",
      ...counts.map((r) => `| ${r.entity} | ${r.n} |`),
      "",
      "## Mapping",
      "",
      "| Metric | Value |",
      "|---|---|",
      ...summary.map((r) => `| ${r.metric} | ${r.value} |`),
      "",
      "## Provenance (entity_sources by source)",
      "",
      "| Source | Entity | Rows |",
      "|---|---|---|",
      ...bySource.map((r) => `| ${r.source_id} | ${r.entity_type} | ${r.n} |`),
      "",
      "## Checks",
      "",
      "| Check | Severity | Result |",
      "|---|---|---|",
      ...checks.map((c) => `| ${c.title} | ${c.severity} | ${c.rows.length === 0 ? "✅ 0" : `${c.severity === "error" ? "❌" : "⚠️"} ${c.rows.length}`} |`),
      "",
    ];
    for (const c of checks.filter((c) => c.rows.length > 0)) {
      md.push(`### ${c.title} (${c.rows.length})`, "");
      const cols = Object.keys(c.rows[0]!);
      md.push(`| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`);
      for (const r of c.rows.slice(0, 100)) md.push(`| ${cols.map((k) => JSON.stringify(r[k]) ?? "").join(" | ")} |`);
      if (c.rows.length > 100) md.push(``, `… ${c.rows.length - 100} more`);
      md.push("");
    }

    const reportsDir = path.join(PROJECT_ROOT, "reports");
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(path.join(reportsDir, "phase1-validation.md"), md.join("\n"));

    for (const c of checks) console.log(`${c.rows.length === 0 ? "ok  " : c.severity === "error" ? "FAIL" : "warn"}  ${c.id}: ${c.rows.length}`);
    console.log(`\n${errors.length === 0 ? "PASS" : "FAIL"} — report: reports/phase1-validation.md`);
    process.exitCode = errors.length === 0 ? 0 : 1;
  } finally {
    await client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main();
}
