/**
 * `pnpm content:export` — builds the content snapshot for the static site from
 * the canonical database (publishable sources only) and copies the referenced
 * audio into public/assets. Run after `pnpm import:hsk1`.
 */
import type { PGlite } from "@electric-sql/pglite";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ContentSnapshot, LessonData, SentenceData, WordData } from "../src/content/types";
import { DEFAULT_DB_DIR, openDb, PROJECT_ROOT } from "../src/db/client";
import { splitSenses, wordSlug } from "../src/domain/display";
import { ASSETS_DIR } from "./build/write";

export const CONTENT_DIR = path.join(PROJECT_ROOT, ".data", "content");
const PUBLIC_ASSETS = path.join(PROJECT_ROOT, "public", "assets");
const MAX_EXAMPLES = 6;
/** hanzi-writer-data (Arphic Public License): one JSON per character, named by the character. */
const STROKE_DATA_DIR = path.join(PROJECT_ROOT, "node_modules", "hanzi-writer-data");

/** ASCII storage key for a character's stroke data, or null when hanzi-writer-data has none. */
function strokeKey(hanzi: string): string | null {
  return existsSync(path.join(STROKE_DATA_DIR, `${hanzi}.json`)) ? `strokes/${hanzi.codePointAt(0)!.toString(16)}.json` : null;
}

type Row = Record<string, unknown>;
const rows = async <T = Row>(client: PGlite, sql: string, params: unknown[] = []) => (await client.query<T>(sql, params)).rows;

/** Entities that have at least one publishable provenance record. */
const PUBLISHABLE = (type: string, alias: string) => `EXISTS (
  SELECT 1 FROM content.entity_sources es JOIN content.sources src ON src.id = es.source_id AND src.publishable
  WHERE es.entity_type = '${type}' AND es.entity_id = ${alias}.id)`;

export async function buildSnapshot(client: PGlite, level: string): Promise<ContentSnapshot> {
  // ── Words ────────────────────────────────────────────────────────────────
  const wordRows = await rows<{ id: number; simplified: string; traditional: string | null; pinyin_key: string; pinyin_marked: string; in_curriculum: boolean; level: string | null }>(client, `
    SELECT w.id, w.simplified, w.traditional, w.pinyin_key, w.pinyin_marked, w.in_curriculum, h.level
    FROM content.words w
    LEFT JOIN content.hsk_assignments h ON h.entity_type = 'word' AND h.entity_id = w.id AND h.standard = 'hsk3-2021'
    WHERE ${PUBLISHABLE("word", "w")} ORDER BY w.id`);
  const slugById = new Map(wordRows.map((w) => [w.id, wordSlug(w.simplified, w.pinyin_key)]));

  const senseRows = await rows<{ word_id: number; text: string; source_record_id: string }>(client, `
    SELECT ws.word_id, ws.text, ws.source_record_id FROM content.word_senses ws
    JOIN content.sources src ON src.id = ws.source_id AND src.publishable
    WHERE ws.lang = 'vi' ORDER BY ws.word_id, (ws.source_id = 'hsk1-chinese-learning') DESC, ws.id`);
  const enRows = await rows<{ word_id: number; text: string }>(client, `
    SELECT ws.word_id, ws.text FROM content.word_senses ws
    JOIN content.sources src ON src.id = ws.source_id AND src.publishable
    WHERE ws.lang = 'en' ORDER BY ws.word_id, ws.id`);
  const enByWord = new Map<number, string[]>();
  for (const s of enRows) {
    const list = enByWord.get(s.word_id) ?? [];
    if (!list.includes(s.text)) list.push(s.text);
    enByWord.set(s.word_id, list);
  }
  const sensesByWord = new Map<number, Array<{ text: string; recordId: string }>>();
  for (const s of senseRows) {
    if (!sensesByWord.has(s.word_id)) sensesByWord.set(s.word_id, []);
    sensesByWord.get(s.word_id)!.push({ text: s.text, recordId: s.source_record_id });
  }

  const charRows = await rows<{ word_id: number; position: number; hanzi: string; pinyin: string | null; readings: string[] | null }>(client, `
    SELECT wc.word_id, wc.position, c.hanzi,
      (SELECT r.pinyin_marked FROM content.character_readings r WHERE r.character_id = c.id ORDER BY r.is_primary DESC, r.id LIMIT 1) AS pinyin,
      (SELECT array_agg(v.reading ORDER BY v.is_primary DESC, v.id) FROM content.character_sino_viet v
         JOIN content.sources src ON src.id = v.source_id AND src.publishable WHERE v.character_id = c.id) AS readings
    FROM content.word_characters wc JOIN content.characters c ON c.id = wc.character_id
    ORDER BY wc.word_id, wc.position`);
  const charsByWord = new Map<number, WordData["chars"]>();
  for (const c of charRows) {
    if (!charsByWord.has(c.word_id)) charsByWord.set(c.word_id, []);
    charsByWord.get(c.word_id)!.push({ hanzi: c.hanzi, pinyin: c.pinyin, sinoViet: c.readings ?? [], stroke: strokeKey(c.hanzi) });
  }

  // ── Sentences (publishable provenance only) ──────────────────────────────
  const sentenceRows = (await rows<{ id: number; key: string; simplified: string; pinyin_marked: string | null; level: string | null }>(client, `
    SELECT s.id, s.simplified, s.pinyin_marked, h.level,
      (SELECT es.source_record_id FROM content.entity_sources es WHERE es.entity_type = 'sentence' AND es.entity_id = s.id
         AND es.source_id = 'hsk-sentences-audio' ORDER BY es.id LIMIT 1) AS key
    FROM content.sentences s
    LEFT JOIN content.hsk_assignments h ON h.entity_type = 'sentence' AND h.entity_id = s.id AND h.standard = 'hsk3-2021'
    WHERE ${PUBLISHABLE("sentence", "s")} ORDER BY s.id`)
  ).filter((s) => s.key !== null); // the site shows the hsk-sentences-audio corpus (tokens, audio, level)
  const keyBySentence = new Map(sentenceRows.map((s) => [s.id, s.key]));

  const tokenRows = await rows<{ sentence_id: number; surface: string; word_id: number | null }>(client, `
    SELECT sentence_id, surface, word_id FROM content.sentence_tokens ORDER BY sentence_id, position`);
  // Vietnamese: reviewed editorial > human translation (hsk1-chinese-learning) > AI draft.
  const translationRows = await rows<{ sentence_id: number; lang: string; text: string; status: string; source_id: string }>(client, `
    SELECT DISTINCT ON (t.sentence_id, t.lang) t.sentence_id, t.lang, t.text, t.status, t.source_id FROM content.sentence_translations t
    JOIN content.sources src ON src.id = t.source_id AND src.publishable
    WHERE t.lang IN ('vi', 'en')
    ORDER BY t.sentence_id, t.lang, (t.status = 'reviewed') DESC, (t.source_id = 'hsk1-chinese-learning') DESC, t.id`);
  const audioRows = await rows<{ owner_id: number; speed: "normal" | "slow"; storage_key: string }>(client, `
    SELECT owner_id, speed, storage_key FROM content.audio_assets WHERE owner_type = 'sentence'`);

  const sentences: Record<string, SentenceData> = {};
  for (const s of sentenceRows) {
    sentences[s.key] = { key: s.key, simplified: s.simplified, pinyin: s.pinyin_marked, hskLevel: s.level, tokens: [], vi: null, en: null, audio: {} };
  }
  for (const t of tokenRows) {
    const key = keyBySentence.get(t.sentence_id);
    if (!key) continue;
    sentences[key]!.tokens.push({ text: t.surface, word: t.word_id ? (slugById.get(t.word_id) ?? null) : null });
  }
  for (const t of translationRows) {
    const key = keyBySentence.get(t.sentence_id);
    if (!key) continue;
    if (t.lang === "en") sentences[key]!.en = t.text;
    else sentences[key]!.vi = { text: t.text, draft: t.source_id === "editorial" && t.status !== "reviewed" };
  }
  for (const a of audioRows) {
    const key = keyBySentence.get(a.owner_id);
    if (key) sentences[key]!.audio[a.speed] = a.storage_key;
  }

  // ── Lessons ──────────────────────────────────────────────────────────────
  const lessonRows = await rows<{ id: number; slug: string; sort: number; title_vi: string; hsk_level: string; status: string }>(client, `
    SELECT id, slug, sort, title_vi, hsk_level, status FROM content.lessons WHERE hsk_level = $1 ORDER BY sort`, [level]);
  const itemRows = await rows<{ lesson_id: number; step_type: string; entity_type: string; entity_id: number }>(client, `
    SELECT s.lesson_id, s.step_type, i.entity_type, i.entity_id FROM content.lesson_steps s
    JOIN content.lesson_step_items i ON i.step_id = s.id ORDER BY s.lesson_id, s.sort, i.sort`);
  const lessons: LessonData[] = lessonRows.map((l, i) => ({
    slug: l.slug,
    number: i + 1,
    title: l.title_vi,
    hskLevel: l.hsk_level,
    status: l.status,
    words: [],
    sentences: [],
  }));
  const lessonById = new Map(lessonRows.map((l, i) => [l.id, lessons[i]!]));
  const lessonsByWord = new Map<string, string[]>();
  for (const it of itemRows) {
    const lesson = lessonById.get(it.lesson_id);
    if (!lesson) continue;
    if (it.step_type === "vocabulary" && it.entity_type === "word") {
      const slug = slugById.get(it.entity_id);
      if (!slug) continue;
      lesson.words.push(slug);
      lessonsByWord.set(slug, [...(lessonsByWord.get(slug) ?? []), lesson.slug]);
    } else if (it.step_type === "examples" && it.entity_type === "sentence") {
      const key = keyBySentence.get(it.entity_id);
      if (key) lesson.sentences.push(key);
    }
  }

  // ── Examples per word: sentences of the word's lesson first, then by level and length ──
  const lessonOfSentence = new Map<string, string>();
  for (const l of lessons) for (const s of l.sentences) lessonOfSentence.set(s, l.slug);
  const examplesByWord = new Map<string, string[]>();
  for (const s of Object.values(sentences)) {
    for (const t of s.tokens) {
      if (!t.word) continue;
      const list = examplesByWord.get(t.word) ?? [];
      if (!list.includes(s.key)) list.push(s.key);
      examplesByWord.set(t.word, list);
    }
  }

  const words: Record<string, WordData> = {};
  for (const w of wordRows) {
    const slug = slugById.get(w.id)!;
    const ownLessons = lessonsByWord.get(slug) ?? [];
    const examples = (examplesByWord.get(slug) ?? [])
      .sort((a, b) => {
        const la = ownLessons.includes(lessonOfSentence.get(a) ?? "") ? 0 : 1;
        const lb = ownLessons.includes(lessonOfSentence.get(b) ?? "") ? 0 : 1;
        const sa = sentences[a]!;
        const sb = sentences[b]!;
        return la - lb || Number(sa.hskLevel ?? 9) - Number(sb.hskLevel ?? 9) || sa.simplified.length - sb.simplified.length;
      })
      .slice(0, MAX_EXAMPLES);
    words[slug] = {
      slug,
      simplified: w.simplified,
      traditional: w.traditional,
      pinyin: w.pinyin_marked,
      hskLevel: w.level,
      inCurriculum: w.in_curriculum,
      chars: charsByWord.get(w.id) ?? [],
      ...splitSenses(sensesByWord.get(w.id) ?? []),
      meaningsEn: enByWord.get(w.id) ?? [],
      examples,
      lessons: ownLessons,
    };
  }

  const sources = await rows<{ id: string; name: string; url: string; license: string }>(client, `
    SELECT id, name, url, license FROM content.sources WHERE publishable AND id NOT IN ('derived') ORDER BY id`);

  return { version: 1, generatedAt: new Date().toISOString(), level, sources, lessons, words, sentences };
}

/** Copies stroke files for every character in the snapshot, plus the Arphic license they require. */
export function copyStrokeData(snapshot: ContentSnapshot): { copied: number; withoutStrokes: string[] } {
  let copied = 0;
  const withoutStrokes = new Set<string>();
  const dir = path.join(PUBLIC_ASSETS, "strokes");
  mkdirSync(dir, { recursive: true });
  copyFileSync(path.join(STROKE_DATA_DIR, "ARPHICPL.TXT"), path.join(dir, "ARPHICPL.TXT"));
  for (const w of Object.values(snapshot.words)) {
    for (const c of w.chars) {
      if (!c.stroke) {
        withoutStrokes.add(c.hanzi);
        continue;
      }
      const to = path.join(PUBLIC_ASSETS, c.stroke);
      if (!existsSync(to)) {
        copyFileSync(path.join(STROKE_DATA_DIR, `${c.hanzi}.json`), to);
        copied++;
      }
    }
  }
  return { copied, withoutStrokes: [...withoutStrokes] };
}

export function copySnapshotAudio(snapshot: ContentSnapshot): { copied: number; missing: string[] } {
  let copied = 0;
  const missing: string[] = [];
  for (const s of Object.values(snapshot.sentences)) {
    for (const key of Object.values(s.audio)) {
      if (!key) continue;
      const from = path.join(ASSETS_DIR, key);
      const to = path.join(PUBLIC_ASSETS, key);
      if (!existsSync(from)) {
        missing.push(key);
        continue;
      }
      if (!existsSync(to)) {
        mkdirSync(path.dirname(to), { recursive: true });
        copyFileSync(from, to);
        copied++;
      }
    }
  }
  return { copied, missing };
}

async function main() {
  const level = "1";
  const { client } = await openDb(DEFAULT_DB_DIR);
  try {
    const snapshot = await buildSnapshot(client, level);
    mkdirSync(CONTENT_DIR, { recursive: true });
    writeFileSync(path.join(CONTENT_DIR, `hsk${level}.json`), JSON.stringify(snapshot));
    const audio = copySnapshotAudio(snapshot);
    const strokes = copyStrokeData(snapshot);
    console.log({
      lessons: snapshot.lessons.length,
      words: Object.keys(snapshot.words).length,
      sentences: Object.keys(snapshot.sentences).length,
      audioCopied: audio.copied,
      audioMissing: audio.missing.length,
      strokeFilesCopied: strokes.copied,
      charactersWithoutStrokeData: strokes.withoutStrokes,
    });
    if (audio.missing.length > 0) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main();
}
