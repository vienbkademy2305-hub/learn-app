/**
 * Builds the canonical graph for HSK levels 1..maxLevel from all adapters, in
 * the order Word(HSK list) → Sentence(+tokens, grammar, audio) → hsk1-chinese-
 * learning cross-links → Character → derived HSK levels. Lessons are added
 * afterwards from editorial YAML (see lessons.ts).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { numberedToMarked, pinyinCompare, pinyinKey } from "../../src/domain/pinyin";
import { codepointId, hanChars, isHan } from "../../src/domain/text";
import type { HskListItem } from "../adapters/complete-hsk-vocabulary";
import type { HskGrammarPoint, HskSentence, ReviewFlag } from "../adapters/hsk-sentences-audio";
import type { Hsk1Sentence, Hsk1Word } from "../adapters/hsk1-chinese-learning";
import type { CvdictEntry, MakemeahanziEntry } from "../adapters/xue-hanzi";
import { CanonicalGraph, type WordRow } from "./graph";
import { matchByPinyin, type WordCandidate } from "./match";

export interface PipelineInputs {
  cvdict: CvdictEntry[];
  sinoViet: Record<string, string[]>;
  sinoVietOverrides: Record<string, string[]>;
  makemeahanzi: Map<string, MakemeahanziEntry>;
  /** index 0 = HSK level 1 */
  hskLists: HskListItem[][];
  hskSentences: HskSentence[];
  grammarPoints: HskGrammarPoint[];
  reviewFlags: ReviewFlag[];
  /** Directory that audio paths in sentences.json are relative to. */
  audioBaseDir: string;
  hsk1Words: Hsk1Word[];
  hsk1Sentences: Hsk1Sentence[];
}

export interface PipelineStats {
  [key: string]: number | Record<string, number> | string[];
}

interface CvdictGroup {
  key: string;
  entries: CvdictEntry[];
}

/** CVDICT grouped by simplified → pinyinKey (several lines can share a key, e.g. different traditional forms). */
function indexCvdict(entries: CvdictEntry[]): Map<string, Map<string, CvdictGroup>> {
  const index = new Map<string, Map<string, CvdictGroup>>();
  for (const e of entries) {
    const simp = e.simplified.normalize("NFC");
    const key = pinyinKey(e.pinyinNumbered);
    let bySimp = index.get(simp);
    if (!bySimp) index.set(simp, (bySimp = new Map()));
    let group = bySimp.get(key);
    if (!group) bySimp.set(key, (group = { key: CanonicalGraph.wordKey(simp, e.pinyinNumbered), entries: [] }));
    group.entries.push(e);
  }
  return index;
}

/** Lowercase readings first: capitalized CEDICT lines are proper nouns. */
function preferredEntry(group: CvdictGroup): CvdictEntry {
  return group.entries.find((e) => !/^[A-Z]/.test(e.pinyinNumbered)) ?? group.entries[0]!;
}

export function buildGraph(inputs: PipelineInputs, maxLevel: number) {
  const g = new CanonicalGraph();
  const cvdict = indexCvdict(inputs.cvdict);
  const stats: PipelineStats = {};
  const count = (name: string, by = 1) => {
    stats[name] = ((stats[name] as number | undefined) ?? 0) + by;
  };

  /** Create/reuse a word from its CVDICT group, attaching Vietnamese senses and provenance. */
  const wordFromCvdict = (group: CvdictGroup): WordRow => {
    const first = preferredEntry(group);
    const { row, created } = g.ensureWord({
      simplified: first.simplified,
      traditional: first.traditional,
      numbered: first.pinyinNumbered,
    });
    if (created || !g.findBySource("word", "cvdict", first.recordId)) {
      group.entries.forEach((e, i) => {
        g.addSource("word", row.id, "cvdict", e.recordId, i === 0 ? "primary" : "merged");
        for (const sense of e.senses) g.addSense(row.id, "vi", sense, "cvdict", e.recordId);
      });
    }
    return row;
  };

  const candidatesFor = (simplified: string): WordCandidate[] => {
    const map = new Map<string, WordCandidate>();
    for (const w of g.wordsBySimplified(simplified)) {
      map.set(CanonicalGraph.wordKey(w.simplified, w.pinyinNumbered), { key: CanonicalGraph.wordKey(w.simplified, w.pinyinNumbered), numbered: w.pinyinNumbered, inCurriculum: w.inCurriculum });
    }
    for (const group of cvdict.get(simplified.normalize("NFC"))?.values() ?? []) {
      if (!map.has(group.key)) map.set(group.key, { key: group.key, numbered: preferredEntry(group).pinyinNumbered, inCurriculum: false });
    }
    return [...map.values()];
  };

  /** Resolve a candidate key to a word row, creating it from CVDICT when needed. */
  const wordForKey = (key: string): WordRow => {
    const existing = g.words.get(key);
    if (existing) return existing;
    const [simp] = key.split("|") as [string];
    const group = [...(cvdict.get(simp)?.values() ?? [])].find((gr) => gr.key === key);
    if (!group) throw new Error(`no CVDICT group for ${key}`);
    return wordFromCvdict(group);
  };

  // ── 1. HSK word lists (complete-hsk-vocabulary) ────────────────────────────
  const levelSentences = inputs.hskSentences.filter((s) => s.hsk_level <= maxLevel);
  const attested = new Map<string, Set<string>>();
  for (const s of levelSentences) {
    for (const t of s.tokens) {
      if (!attested.has(t.word)) attested.set(t.word, new Set());
      attested.get(t.word)!.add(pinyinCompare(t.pinyin));
    }
  }

  for (let level = 1; level <= maxLevel; level++) {
    const list = inputs.hskLists[level - 1] ?? [];
    count(`hsk${level}_list_items`, list.length);
    for (const item of list) {
      const byKey = new Map<string, { numeric: string; traditional: string }>();
      const lower = item.forms.filter((f) => !/^[A-Z]/.test(f.transcriptions.numeric));
      for (const f of lower.length > 0 ? lower : item.forms) {
        const k = pinyinKey(f.transcriptions.numeric);
        if (!byKey.has(k)) byKey.set(k, { numeric: f.transcriptions.numeric, traditional: f.traditional });
      }
      let readings = [...byKey.values()];
      if (readings.length > 1) {
        const seen = attested.get(item.simplified);
        const used = readings.filter((r) => seen?.has(pinyinCompare(numberedToMarked(r.numeric))));
        if (used.length > 0) {
          readings = used;
          count("hsk_readings_resolved_by_sentences");
        } else {
          g.review("hsk_list_item", null, "hsk_reading_ambiguous", {
            simplified: item.simplified,
            level,
            readings: readings.map((r) => r.numeric),
          });
          count("hsk_readings_ambiguous");
        }
      }

      for (const r of readings) {
        const group = cvdict.get(item.simplified)?.get(pinyinKey(r.numeric));
        const word = group
          ? wordFromCvdict(group)
          : g.ensureWord({
              simplified: item.simplified,
              traditional: r.traditional,
              numbered: r.numeric,
              kind: /^[A-Z]/.test(r.numeric) ? "name" : "word",
            }).row;
        if (!group) count("hsk_words_not_in_cvdict");
        // English meanings of every form with this reading (complete-hsk-vocabulary, from CC-CEDICT).
        const recordId = `new/${level}|${item.simplified}|${pinyinKey(r.numeric)}`;
        const isProper = (n: string) => /^[A-Z]/.test(n);
        const sameReading = item.forms.filter(
          (f) => pinyinKey(f.transcriptions.numeric) === pinyinKey(r.numeric) && isProper(f.transcriptions.numeric) === isProper(r.numeric),
        );
        for (const f of sameReading) {
          for (const meaning of f.meanings) g.addSense(word.id, "en", meaning, "complete-hsk-vocabulary", recordId);
        }
        word.inCurriculum = true;
        g.setHsk("word", word.id, String(level), "complete-hsk-vocabulary");
        g.addSource("word", word.id, "complete-hsk-vocabulary", `new/${level}|${item.simplified}|${pinyinKey(r.numeric)}`, group ? "attribute" : "primary");
      }
    }
  }

  // ── 2. Grammar points (needed before sentence tags) ────────────────────────
  const grammarByCode = new Map(inputs.grammarPoints.map((p) => [p.id, p]));
  const ensureGrammar = (code: string) => {
    const existing = g.grammar.get(code);
    if (existing) return existing;
    const p = grammarByCode.get(code);
    if (!p) return undefined;
    const row = {
      id: g.nextId("grammar_points"),
      code: p.id,
      category: p.cat,
      subcategory: p.sub,
      labelZh: p.label,
      labelFullZh: p.label_full,
      pattern: p.pattern,
      exclude: p.exclude,
      examplesZh: p.examples,
      titleVi: null,
      explanationVi: null,
      sourceId: "hsk-grammar-krmanik" as const,
    };
    g.grammar.set(code, row);
    g.addSource("grammar", row.id, "hsk-grammar-krmanik", p.id);
    g.setHsk("grammar", row.id, String(p.level), "hsk-grammar-krmanik");
    return row;
  };
  for (const p of inputs.grammarPoints) if (p.level <= maxLevel) ensureGrammar(p.id);

  // ── 3. Sentences from hsk-sentences-audio ──────────────────────────────────
  const flagsBySentence = new Map<string, string[]>();
  for (const f of inputs.reviewFlags) {
    if (!flagsBySentence.has(f.sentenceId)) flagsBySentence.set(f.sentenceId, []);
    flagsBySentence.get(f.sentenceId)!.push(f.note);
  }
  const tokenResolution: Record<string, number> = {};
  const unresolvedTokens = new Map<string, { reason: string; count: number; pinyin: string }>();

  for (const s of levelSentences) {
    const { row, created } = g.ensureSentence(s.chinese);
    g.addSource("sentence", row.id, "hsk-sentences-audio", s.id, created ? "primary" : "merged");
    g.setHsk("sentence", row.id, String(s.hsk_level), "hsk-sentences-audio");
    if (!created) {
      count("sentences_duplicate_merged");
      continue;
    }
    count("sentences_imported_hsk_sentences_audio");
    Object.assign(row, {
      traditional: s.traditional,
      pinyinMarked: s.pinyin,
      pinyinNumbered: s.pinyin_numbered,
      topic: s.topic,
      sentenceType: s.sentence_type,
    });

    if (s.translation.en) {
      g.translations.push({ id: g.nextId("sentence_translations"), sentenceId: row.id, lang: "en", text: s.translation.en, status: "imported", sourceId: "hsk-sentences-audio", sourceRecordId: s.id });
    }

    s.tokens.forEach((t, position) => {
      let resolution: (typeof g.tokens)[number]["resolution"];
      let wordId: number | null = null;
      if (![...t.word].some(isHan)) {
        resolution = /^[\p{P}\p{S}\s]+$/u.test(t.word) ? "punct" : "non_han";
      } else {
        const result = matchByPinyin(t.pinyin, candidatesFor(t.word));
        if (result.status === "unresolved") {
          resolution = "unresolved";
          const k = `${t.word}|${t.pinyin}`;
          const prev = unresolvedTokens.get(k);
          unresolvedTokens.set(k, { reason: result.reason, count: (prev?.count ?? 0) + 1, pinyin: t.pinyin });
        } else {
          resolution = result.status;
          wordId = wordForKey(result.key).id;
        }
      }
      tokenResolution[resolution] = (tokenResolution[resolution] ?? 0) + 1;
      g.tokens.push({ sentenceId: row.id, position, surface: t.word, wordId, pinyin: t.pinyin || null, glossEn: t.gloss_en ?? null, resolution });
    });

    for (const tag of s.grammar_tags) {
      const gp = ensureGrammar(tag);
      if (!gp) {
        g.review("sentence", row.id, "unknown_grammar_tag", { tag, sentence: s.id });
        continue;
      }
      g.sentenceGrammar.set(`${row.id}:${gp.id}`, { sentenceId: row.id, grammarPointId: gp.id, sourceId: "hsk-sentences-audio" });
    }

    for (const speed of ["normal", "slow"] as const) {
      const rel = s.audio[speed];
      const sourcePath = path.join(inputs.audioBaseDir, rel);
      if (!existsSync(sourcePath)) {
        g.review("sentence", row.id, "audio_file_missing_in_source", { sentence: s.id, speed, path: rel });
        count("audio_missing_in_source");
        continue;
      }
      g.audio.push({
        id: g.nextId("audio_assets"),
        ownerType: "sentence",
        ownerId: row.id,
        speed,
        storageKey: `audio/hsk-sentences-audio/${path.posix.basename(rel)}`,
        mime: "audio/mpeg",
        durationMs: null,
        engine: s.audio_meta.engine,
        voice: s.audio_meta.voice,
        isSynthetic: true,
        license: s.audio_meta.license,
        sha256: "", // filled by the writer when the file is copied
        sourceId: "hsk-sentences-audio",
        sourceRecordId: rel,
        sourcePath,
      });
    }

    for (const note of flagsBySentence.get(s.id) ?? []) {
      g.review("sentence", row.id, "polyphone_flag", { sentence: s.id, note });
      count("polyphone_flags");
    }
  }
  stats.token_resolution = tokenResolution;
  for (const [k, v] of unresolvedTokens) {
    const [surface] = k.split("|");
    g.review("token", null, "unmatched_token", { surface, pinyin: v.pinyin, reason: v.reason, occurrences: v.count });
  }
  stats.unresolved_token_types = unresolvedTokens.size;

  // ── 4. hsk1-chinese-learning (non-publishable, cross-links only) ───────────
  const hsk1Stats: Record<string, number> = {};
  const bump = (k: string) => (hsk1Stats[k] = (hsk1Stats[k] ?? 0) + 1);
  for (const w of inputs.hsk1Words) {
    const result = matchByPinyin(w.pinyin, candidatesFor(w.hanzi));
    if (result.status === "unresolved") {
      bump(`word_unresolved_${result.reason}`);
      g.review("hsk1_cl_word", null, "unmatched_hsk1_cl_word", { hanzi: w.hanzi, pinyin: w.pinyin, reason: result.reason, candidates: result.candidates });
      continue;
    }
    const word = wordForKey(result.key);
    bump(word.inCurriculum ? "word_mapped_to_hsk_word" : "word_mapped_outside_hsk_list");
    if (result.status === "matched_toneless") bump("word_mapped_toneless");
    g.addSource("word", word.id, "hsk1-chinese-learning", `vocabulary#${w.index}`, "attribute");
    g.addSense(word.id, "vi", w.vietnamese, "hsk1-chinese-learning", `vocabulary#${w.index}`);
  }
  for (const s of inputs.hsk1Sentences) {
    const { row, created } = g.ensureSentence(s.hanzi);
    g.addSource("sentence", row.id, "hsk1-chinese-learning", s.recordId, created ? "primary" : "merged");
    bump(created ? "sentence_new" : "sentence_merged_with_existing");
    if (created) row.pinyinMarked = s.pinyin;
    g.translations.push({ id: g.nextId("sentence_translations"), sentenceId: row.id, lang: "vi", text: s.translation, status: "imported", sourceId: "hsk1-chinese-learning", sourceRecordId: s.recordId });
  }
  stats.hsk1_chinese_learning = hsk1Stats;

  // English fallback for words outside the HSK list: the token gloss of hsk-sentences-audio (CC-CEDICT).
  const hasEnglish = new Set(g.wordSenses.filter((s) => s.lang === "en").map((s) => s.wordId));
  for (const t of g.tokens) {
    if (t.wordId === null || !t.glossEn || hasEnglish.has(t.wordId)) continue;
    g.addSense(t.wordId, "en", t.glossEn, "hsk-sentences-audio", `token:${t.sentenceId}:${t.position}`);
    hasEnglish.add(t.wordId);
    count("words_en_from_token_gloss");
  }

  // ── 5. Characters (Word → Character, Sentence → Character) ────────────────
  const cvdictTraditional = (char: string): string | undefined => {
    for (const group of cvdict.get(char)?.values() ?? []) {
      const trad = preferredEntry(group).traditional;
      if (trad !== char) return trad;
    }
    return undefined;
  };

  for (const w of g.words.values()) {
    [...w.simplified].forEach((ch, position) => {
      if (!isHan(ch)) return;
      const { row } = g.ensureCharacter(ch);
      g.wordCharacters.push({ wordId: w.id, position, characterId: row.id });
    });
  }
  for (const s of g.sentences.values()) for (const ch of hanChars(s.simplified)) g.ensureCharacter(ch);

  for (const c of g.characters.values()) {
    c.traditional = cvdictTraditional(c.hanzi) ?? null;

    // Sino-Vietnamese: Unihan by simplified, then by traditional; then author overrides (non-publishable).
    const lookups: Array<[string, Record<string, string[]>, "unihan-kvietnamese" | "xue-hanzi-sinoviet-overrides"]> = [
      [c.hanzi, inputs.sinoViet, "unihan-kvietnamese"],
      ...(c.traditional ? [[c.traditional, inputs.sinoViet, "unihan-kvietnamese"] as [string, Record<string, string[]>, "unihan-kvietnamese"]] : []),
    ];
    let found = false;
    for (const [form, table, sourceId] of lookups) {
      const readings = table[form];
      if (!readings?.length) continue;
      readings.forEach((reading, i) =>
        g.characterSinoViet.push({ id: g.nextId("character_sino_viet"), characterId: c.id, reading, isPrimary: i === 0, status: "imported", sourceId, sourceRecordId: codepointId(form) }),
      );
      g.addSource("character", c.id, sourceId, codepointId(form), "attribute");
      found = true;
      break;
    }
    for (const form of [c.hanzi, c.traditional].filter(Boolean) as string[]) {
      const readings = inputs.sinoVietOverrides[form];
      if (!readings?.length) continue;
      readings.forEach((reading, i) =>
        g.characterSinoViet.push({ id: g.nextId("character_sino_viet"), characterId: c.id, reading, isPrimary: !found && i === 0, status: "imported", sourceId: "xue-hanzi-sinoviet-overrides", sourceRecordId: codepointId(form) }),
      );
      break;
    }
    if (!found) g.review("character", c.id, "missing_sino_viet", { hanzi: c.hanzi, traditional: c.traditional });

    // Readings from single-character CVDICT entries.
    const groups = [...(cvdict.get(c.hanzi)?.values() ?? [])];
    const primaryKey = groups.find((gr) => !/^[A-Z]/.test(preferredEntry(gr).pinyinNumbered))?.key;
    const seen = new Set<string>();
    for (const gr of groups) {
      const e = preferredEntry(gr);
      const numbered = e.pinyinNumbered.toLowerCase();
      if (seen.has(numbered)) continue;
      seen.add(numbered);
      g.characterReadings.push({ id: g.nextId("character_readings"), characterId: c.id, pinyinNumbered: numbered, pinyinMarked: numberedToMarked(numbered), isPrimary: gr.key === primaryKey, sourceId: "cvdict", sourceRecordId: e.recordId });
    }

    const mm = inputs.makemeahanzi.get(c.hanzi);
    if (mm) {
      c.radical = mm.radical ?? null;
      c.decomposition = mm.decomposition ?? null;
      c.etymology = mm.etymology ?? null;
      c.definitionEn = mm.definition ?? null;
      g.addSource("character", c.id, "makemeahanzi", mm.character, "attribute");
    }
    // Every character has one primary provenance record: its codepoint.
    g.addSource("character", c.id, "derived", codepointId(c.hanzi), "primary");
  }

  // ── 6. Derived HSK level of characters: lowest level of a curriculum word containing it ──
  const wordsById = new Map([...g.words.values()].map((w) => [w.id, w]));
  for (const wc of g.wordCharacters) {
    const word = wordsById.get(wc.wordId);
    if (!word?.inCurriculum) continue;
    const level = g.hskLevel("word", word.id);
    if (level) g.setHsk("character", wc.characterId, level, "derived", true);
  }

  stats.words_total = g.words.size;
  stats.words_in_curriculum = [...g.words.values()].filter((w) => w.inCurriculum).length;
  stats.characters_total = g.characters.size;
  stats.sentences_total = g.sentences.size;
  stats.grammar_points = g.grammar.size;
  stats.audio_assets = g.audio.length;
  return { graph: g, stats };
}
