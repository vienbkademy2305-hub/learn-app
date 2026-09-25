/**
 * In-memory canonical graph. Importers map every source record into it through
 * the ensure*() helpers, which are the single place where de-duplication keys
 * are applied (docs/DATA_MAPPING.md §3, ARCHITECTURE §20). The writer then
 * persists the graph as-is.
 */
import { numberedToMarked, pinyinKey } from "../../src/domain/pinyin";
import { sentenceHash } from "../../src/domain/text";
import type { SourceId } from "../lib/catalog";

export type EntityType = "character" | "word" | "sentence" | "grammar" | "lesson" | "audio";

export interface CharacterRow {
  id: number;
  hanzi: string;
  traditional: string | null;
  radical: string | null;
  decomposition: string | null;
  etymology: unknown;
  definitionEn: string | null;
}
export interface WordRow {
  id: number;
  simplified: string;
  traditional: string | null;
  pinyinKey: string;
  pinyinNumbered: string;
  pinyinMarked: string;
  kind: "word" | "phrase" | "name";
  inCurriculum: boolean;
}
export interface SentenceRow {
  id: number;
  simplified: string;
  traditional: string | null;
  pinyinMarked: string | null;
  pinyinNumbered: string | null;
  topic: string | null;
  sentenceType: string | null;
  contentHash: string;
}
export interface TokenRow {
  sentenceId: number;
  position: number;
  surface: string;
  wordId: number | null;
  pinyin: string | null;
  glossEn: string | null;
  resolution: "matched" | "matched_toneless" | "punct" | "non_han" | "unresolved";
}
export interface GrammarRow {
  id: number;
  code: string;
  category: string | null;
  subcategory: string | null;
  labelZh: string;
  labelFullZh: string | null;
  pattern: string | null;
  exclude: string | null;
  examplesZh: string[];
  titleVi: string | null;
  explanationVi: string | null;
  sourceId: SourceId;
}
export interface AudioRow {
  id: number;
  ownerType: "sentence";
  ownerId: number;
  speed: "normal" | "slow";
  storageKey: string;
  mime: string;
  durationMs: number | null;
  engine: string | null;
  voice: string | null;
  isSynthetic: boolean;
  license: string | null;
  sha256: string;
  sourceId: SourceId;
  sourceRecordId: string;
  /** Absolute path of the file inside the source repo (copied by the writer). */
  sourcePath: string;
}
export interface LessonRow {
  id: number;
  slug: string;
  hskLevel: string;
  sort: number;
  titleVi: string;
  summaryVi: string | null;
  status: string;
  sourceId: SourceId;
  sourceRecordId: string;
}
export interface ReviewItem {
  id: number;
  entityType: string;
  entityId: number | null;
  issue: string;
  detail: Record<string, unknown>;
  status: "open";
}

export class CanonicalGraph {
  private seq = new Map<string, number>();

  readonly characters = new Map<string, CharacterRow>();
  readonly characterReadings: Array<{ id: number; characterId: number; pinyinNumbered: string; pinyinMarked: string; isPrimary: boolean; sourceId: SourceId; sourceRecordId: string }> = [];
  readonly characterSinoViet: Array<{ id: number; characterId: number; reading: string; isPrimary: boolean; status: string; sourceId: SourceId; sourceRecordId: string }> = [];
  readonly words = new Map<string, WordRow>();
  readonly wordCharacters: Array<{ wordId: number; position: number; characterId: number }> = [];
  readonly wordSenses: Array<{ id: number; wordId: number; lang: string; text: string; sort: number; status: string; sourceId: SourceId; sourceRecordId: string }> = [];
  readonly hsk = new Map<string, { id: number; entityType: EntityType; entityId: number; standard: string; level: string; derived: boolean; sourceId: SourceId }>();
  readonly sentences = new Map<string, SentenceRow>();
  readonly tokens: TokenRow[] = [];
  readonly translations: Array<{ id: number; sentenceId: number; lang: string; text: string; status: string; sourceId: SourceId; sourceRecordId: string }> = [];
  readonly grammar = new Map<string, GrammarRow>();
  readonly sentenceGrammar = new Map<string, { sentenceId: number; grammarPointId: number; sourceId: SourceId }>();
  readonly audio: AudioRow[] = [];
  readonly lessons: LessonRow[] = [];
  readonly lessonSteps: Array<{ id: number; lessonId: number; sort: number; stepType: string; config: unknown }> = [];
  readonly lessonStepItems: Array<{ stepId: number; sort: number; entityType: string; entityId: number }> = [];
  readonly entitySources = new Map<string, { id: number; entityType: EntityType; entityId: number; sourceId: SourceId; sourceRecordId: string; role: string }>();
  readonly reviewQueue: ReviewItem[] = [];
  /** Same source record claimed by two different entities — should never happen. */
  readonly provenanceConflicts: string[] = [];

  nextId(table: string): number {
    const next = (this.seq.get(table) ?? 0) + 1;
    this.seq.set(table, next);
    return next;
  }

  static wordKey(simplified: string, numbered: string): string {
    return `${simplified.normalize("NFC")}|${pinyinKey(numbered)}`;
  }

  addSource(entityType: EntityType, entityId: number, sourceId: SourceId, sourceRecordId: string, role = "primary"): void {
    const key = `${sourceId}|${sourceRecordId}|${entityType}`;
    const existing = this.entitySources.get(key);
    if (existing) {
      if (existing.entityId !== entityId) this.provenanceConflicts.push(`${key} → ${existing.entityId} and ${entityId}`);
      return;
    }
    this.entitySources.set(key, { id: this.nextId("entity_sources"), entityType, entityId, sourceId, sourceRecordId, role });
  }

  /** Entity id previously registered for a source record, if any. */
  findBySource(entityType: EntityType, sourceId: SourceId, sourceRecordId: string): number | undefined {
    return this.entitySources.get(`${sourceId}|${sourceRecordId}|${entityType}`)?.entityId;
  }

  ensureCharacter(hanzi: string): { row: CharacterRow; created: boolean } {
    const key = hanzi.normalize("NFC");
    const existing = this.characters.get(key);
    if (existing) return { row: existing, created: false };
    const row: CharacterRow = {
      id: this.nextId("characters"),
      hanzi: key,
      traditional: null,
      radical: null,
      decomposition: null,
      etymology: null,
      definitionEn: null,
    };
    this.characters.set(key, row);
    return { row, created: true };
  }

  ensureWord(input: { simplified: string; traditional: string | null; numbered: string; kind?: WordRow["kind"] }): { row: WordRow; created: boolean } {
    const key = CanonicalGraph.wordKey(input.simplified, input.numbered);
    const existing = this.words.get(key);
    if (existing) return { row: existing, created: false };
    const row: WordRow = {
      id: this.nextId("words"),
      simplified: input.simplified.normalize("NFC"),
      traditional: input.traditional,
      pinyinKey: pinyinKey(input.numbered),
      pinyinNumbered: input.numbered,
      pinyinMarked: numberedToMarked(input.numbered),
      kind: input.kind ?? "word",
      inCurriculum: false,
    };
    this.words.set(key, row);
    return { row, created: true };
  }

  wordsBySimplified(simplified: string): WordRow[] {
    const prefix = `${simplified.normalize("NFC")}|`;
    return [...this.words.entries()].filter(([k]) => k.startsWith(prefix)).map(([, w]) => w);
  }

  addSense(wordId: number, lang: string, text: string, sourceId: SourceId, sourceRecordId: string): void {
    const dup = this.wordSenses.some((s) => s.wordId === wordId && s.lang === lang && s.text === text && s.sourceId === sourceId);
    if (dup) return;
    const sort = this.wordSenses.filter((s) => s.wordId === wordId && s.lang === lang).length;
    this.wordSenses.push({ id: this.nextId("word_senses"), wordId, lang, text, sort, status: "imported", sourceId, sourceRecordId });
  }

  ensureSentence(text: string): { row: SentenceRow; created: boolean } {
    const hash = sentenceHash(text);
    const existing = this.sentences.get(hash);
    if (existing) return { row: existing, created: false };
    const row: SentenceRow = {
      id: this.nextId("sentences"),
      simplified: text.normalize("NFC"),
      traditional: null,
      pinyinMarked: null,
      pinyinNumbered: null,
      topic: null,
      sentenceType: null,
      contentHash: hash,
    };
    this.sentences.set(hash, row);
    return { row, created: true };
  }

  setHsk(entityType: EntityType, entityId: number, level: string, sourceId: SourceId, derived = false, standard = "hsk3-2021"): void {
    const key = `${entityType}:${entityId}:${standard}`;
    const existing = this.hsk.get(key);
    // Keep the lowest level when the same entity is reached through several records.
    if (existing && Number(existing.level) <= Number(level)) return;
    this.hsk.set(key, { id: existing?.id ?? this.nextId("hsk_assignments"), entityType, entityId, standard, level, derived, sourceId });
  }

  hskLevel(entityType: EntityType, entityId: number, standard = "hsk3-2021"): string | undefined {
    return this.hsk.get(`${entityType}:${entityId}:${standard}`)?.level;
  }

  review(entityType: string, entityId: number | null, issue: string, detail: Record<string, unknown>): void {
    this.reviewQueue.push({ id: this.nextId("review_queue"), entityType, entityId, issue, detail, status: "open" });
  }
}
