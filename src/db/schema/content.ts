/**
 * Canonical content model (docs/ARCHITECTURE.md §18, docs/DATA_MAPPING.md §3).
 * Written only by importers; the app reads it. Every imported row is traceable
 * through `source_id` + `source_record_id` columns or `entity_sources`.
 */
import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const content = pgSchema("content");

// ── Sources & provenance ─────────────────────────────────────────────────────

export const sources = content.table("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  license: text("license").notNull(),
  /** false = imported for mapping/cross-checking only, never shown in the app. */
  publishable: boolean("publishable").notNull(),
  /** Repository the file was read from, when it is not the origin itself. */
  via: text("via"),
  notes: text("notes"),
});

export const sourceVersions = content.table(
  "source_versions",
  {
    id: integer("id").primaryKey(),
    sourceId: text("source_id").notNull().references(() => sources.id),
    version: text("version").notNull(),
    files: jsonb("files").$type<Record<string, string>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique().on(t.sourceId, t.version)],
);

export const importRuns = content.table("import_runs", {
  id: integer("id").primaryKey(),
  scope: text("scope").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  stats: jsonb("stats").notNull(),
});

export const entitySources = content.table(
  "entity_sources",
  {
    id: integer("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    sourceId: text("source_id").notNull().references(() => sources.id),
    sourceRecordId: text("source_record_id").notNull(),
    sourceVersionId: integer("source_version_id").references(() => sourceVersions.id),
    role: text("role").notNull(), // 'primary' | 'merged' | 'attribute'
  },
  (t) => [unique().on(t.sourceId, t.sourceRecordId, t.entityType)],
);

// ── Characters ───────────────────────────────────────────────────────────────

export const characters = content.table("characters", {
  id: integer("id").primaryKey(),
  hanzi: text("hanzi").notNull().unique(),
  traditional: text("traditional"),
  radical: text("radical"),
  decomposition: text("decomposition"),
  etymology: jsonb("etymology"),
  definitionEn: text("definition_en"),
});

export const characterReadings = content.table(
  "character_readings",
  {
    id: integer("id").primaryKey(),
    characterId: integer("character_id").notNull().references(() => characters.id),
    pinyinNumbered: text("pinyin_numbered").notNull(),
    pinyinMarked: text("pinyin_marked").notNull(),
    isPrimary: boolean("is_primary").notNull(),
    sourceId: text("source_id").notNull().references(() => sources.id),
    sourceRecordId: text("source_record_id").notNull(),
  },
  (t) => [unique().on(t.characterId, t.pinyinNumbered)],
);

export const characterSinoViet = content.table(
  "character_sino_viet",
  {
    id: integer("id").primaryKey(),
    characterId: integer("character_id").notNull().references(() => characters.id),
    reading: text("reading").notNull(),
    isPrimary: boolean("is_primary").notNull(),
    status: text("status").notNull(), // 'imported' | 'edited' | 'verified'
    sourceId: text("source_id").notNull().references(() => sources.id),
    sourceRecordId: text("source_record_id").notNull(),
  },
  (t) => [unique().on(t.characterId, t.reading, t.sourceId)],
);

// ── Words ────────────────────────────────────────────────────────────────────

export const words = content.table(
  "words",
  {
    id: integer("id").primaryKey(),
    simplified: text("simplified").notNull(),
    traditional: text("traditional"),
    /** Canonical key part, see pinyinKey() in src/domain/pinyin.ts. */
    pinyinKey: text("pinyin_key").notNull(),
    pinyinNumbered: text("pinyin_numbered").notNull(),
    pinyinMarked: text("pinyin_marked").notNull(),
    kind: text("kind").notNull(), // 'word' | 'phrase' | 'name'
    inCurriculum: boolean("in_curriculum").notNull(),
  },
  (t) => [unique().on(t.simplified, t.pinyinKey)],
);

export const wordCharacters = content.table(
  "word_characters",
  {
    wordId: integer("word_id").notNull().references(() => words.id),
    position: integer("position").notNull(),
    characterId: integer("character_id").notNull().references(() => characters.id),
  },
  (t) => [primaryKey({ columns: [t.wordId, t.position] })],
);

export const wordSenses = content.table("word_senses", {
  id: integer("id").primaryKey(),
  wordId: integer("word_id").notNull().references(() => words.id),
  lang: text("lang").notNull(), // 'vi' | 'en'
  text: text("text").notNull(),
  sort: integer("sort").notNull(),
  status: text("status").notNull(),
  sourceId: text("source_id").notNull().references(() => sources.id),
  sourceRecordId: text("source_record_id").notNull(),
});

// ── HSK ──────────────────────────────────────────────────────────────────────

export const hskAssignments = content.table(
  "hsk_assignments",
  {
    id: integer("id").primaryKey(),
    entityType: text("entity_type").notNull(), // 'character' | 'word' | 'sentence' | 'grammar' | 'lesson'
    entityId: integer("entity_id").notNull(),
    standard: text("standard").notNull(), // 'hsk3-2021'
    level: text("level").notNull(), // '1'..'6' | '7-9'
    derived: boolean("derived").notNull(),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [unique().on(t.entityType, t.entityId, t.standard)],
);

// ── Sentences ────────────────────────────────────────────────────────────────

export const sentences = content.table("sentences", {
  id: integer("id").primaryKey(),
  simplified: text("simplified").notNull(),
  traditional: text("traditional"),
  pinyinMarked: text("pinyin_marked"),
  pinyinNumbered: text("pinyin_numbered"),
  topic: text("topic"),
  sentenceType: text("sentence_type"),
  /** sentenceHash(): NFC, whitespace/punctuation removed, sha1. */
  contentHash: text("content_hash").notNull().unique(),
});

export const sentenceTokens = content.table(
  "sentence_tokens",
  {
    sentenceId: integer("sentence_id").notNull().references(() => sentences.id),
    position: integer("position").notNull(),
    surface: text("surface").notNull(),
    wordId: integer("word_id").references(() => words.id),
    pinyin: text("pinyin"),
    glossEn: text("gloss_en"),
    /** 'matched' | 'matched_toneless' | 'punct' | 'unresolved' */
    resolution: text("resolution").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sentenceId, t.position] })],
);

export const sentenceTranslations = content.table(
  "sentence_translations",
  {
    id: integer("id").primaryKey(),
    sentenceId: integer("sentence_id").notNull().references(() => sentences.id),
    lang: text("lang").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull(),
    sourceId: text("source_id").notNull().references(() => sources.id),
    sourceRecordId: text("source_record_id").notNull(),
  },
  (t) => [unique().on(t.sentenceId, t.lang, t.sourceId)],
);

// ── Grammar ──────────────────────────────────────────────────────────────────

export const grammarPoints = content.table("grammar_points", {
  id: integer("id").primaryKey(),
  code: text("code").notNull().unique(),
  category: text("category"),
  subcategory: text("subcategory"),
  labelZh: text("label_zh").notNull(),
  labelFullZh: text("label_full_zh"),
  pattern: text("pattern"),
  exclude: text("exclude"),
  examplesZh: jsonb("examples_zh").$type<string[]>().notNull(),
  titleVi: text("title_vi"),
  explanationVi: text("explanation_vi"),
  sourceId: text("source_id").notNull().references(() => sources.id),
});

export const sentenceGrammar = content.table(
  "sentence_grammar",
  {
    sentenceId: integer("sentence_id").notNull().references(() => sentences.id),
    grammarPointId: integer("grammar_point_id").notNull().references(() => grammarPoints.id),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.sentenceId, t.grammarPointId] })],
);

// ── Audio ────────────────────────────────────────────────────────────────────

export const audioAssets = content.table(
  "audio_assets",
  {
    id: integer("id").primaryKey(),
    ownerType: text("owner_type").notNull(), // 'sentence' | 'word' | 'character' | 'syllable'
    ownerId: integer("owner_id").notNull(),
    speed: text("speed").notNull(), // 'normal' | 'slow'
    storageKey: text("storage_key").notNull().unique(),
    mime: text("mime").notNull(),
    durationMs: integer("duration_ms"),
    engine: text("engine"),
    voice: text("voice"),
    isSynthetic: boolean("is_synthetic").notNull(),
    license: text("license"),
    sha256: text("sha256").notNull(),
    sourceId: text("source_id").notNull().references(() => sources.id),
    sourceRecordId: text("source_record_id").notNull(),
  },
  (t) => [unique().on(t.ownerType, t.ownerId, t.speed, t.sourceId)],
);

// ── Lessons ──────────────────────────────────────────────────────────────────

export const lessons = content.table("lessons", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  hskLevel: text("hsk_level").notNull(),
  sort: integer("sort").notNull(),
  titleVi: text("title_vi").notNull(),
  summaryVi: text("summary_vi"),
  status: text("status").notNull(), // 'draft' | 'published'
  sourceId: text("source_id").notNull().references(() => sources.id),
  sourceRecordId: text("source_record_id").notNull(),
});

export const lessonSteps = content.table(
  "lesson_steps",
  {
    id: integer("id").primaryKey(),
    lessonId: integer("lesson_id").notNull().references(() => lessons.id),
    sort: integer("sort").notNull(),
    stepType: text("step_type").notNull(),
    config: jsonb("config"),
  },
  (t) => [unique().on(t.lessonId, t.sort)],
);

export const lessonStepItems = content.table(
  "lesson_step_items",
  {
    stepId: integer("step_id").notNull().references(() => lessonSteps.id),
    sort: integer("sort").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.stepId, t.sort] })],
);

// ── Review queue (UNRESOLVED items for human editors) ────────────────────────

export const reviewQueue = content.table("review_queue", {
  id: integer("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  issue: text("issue").notNull(),
  detail: jsonb("detail").notNull(),
  status: text("status").notNull(), // 'open' | 'resolved' | 'wontfix'
});
