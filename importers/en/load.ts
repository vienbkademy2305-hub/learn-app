/**
 * English lesson data (data/en/, docs/ENGLISH_SPLIT_PLAN.md). Hand-edited YAML maintained with the
 * `english-content` skill; this module reads it and checks it. Schema:
 * .claude/skills/english-content/references/data-schema.md (repo parent folder).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const STATUSES = ["draft", "reviewed", "retired"] as const;
export const POS = ["n", "v", "adj", "adv", "prep", "conj", "pron", "det", "num", "phr-n", "phr-v", "idiom", "colloc"] as const;
export const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const STEP_ORDER = ["vocabulary", "pronunciation", "grammar", "skill", "examples", "dialogue", "exercises", "homework"] as const;
/** `ai-draft` marks a field Claude filled in without checking a source. */
export const AI_DRAFT = "ai-draft";

export interface Provenance { source: string; field: string; ref?: string; checked?: string }
export interface Source {
  id: string; name: string; type: string; license: string; usage: "import" | "fact" | "reference";
  publishable: boolean; url?: string | null; path?: string | null; sha256?: string | null; added?: string; notes?: string | null;
}
export interface LexEntry {
  id: string; headword: string; pos: string; forms?: Record<string, string>;
  ipa?: { uk?: string | null; us?: string | null } | null; stress?: string; cefr?: string | null;
  meaning_vi: string[]; definition_en?: string | null; collocations?: string[]; word_family?: string[];
  topics?: string[]; notes_vi?: string[]; source: string; source_id?: string | null;
  provenance?: Provenance[]; status: string; replaced_by?: string;
}
export interface Sentence {
  id: string; text: string; vi: string; words?: string[]; grammar?: string[]; cefr?: string | null;
  audio?: Record<string, unknown>; source: string; source_id?: string | null; status: string;
}
export interface GrammarPoint {
  id: string; lesson: string; title: string; cefr?: string | null; structures?: string[]; explain: string;
  table?: string[][]; notes?: string[]; mistakes?: Array<{ wrong: string; right: string; why: string }>;
  examples?: string[]; source: string; provenance?: Provenance[]; status: string;
}
export interface Question {
  q?: string; answer?: string | number; accept?: string[]; options?: string[]; explain_vi?: string; base?: string;
  /** tests only: the lesson that teaches what this question checks (weak-area report) */
  lesson?: number;
}
export interface Exercise {
  id: string; bank_no: number; kind: string; instructions_vi: string; bank?: string[]; passage?: string; text?: string;
  max_words?: number; pairs?: Array<{ left: string; right: string }>;
  /** tests: `lesson` tags one error for the weak-area report */
  errors?: Array<{ wrong: string; right: string; why?: string; lesson?: number }>;
  questions?: Question[]; cue_card?: { topic: string; points: string[] }; sample?: string;
  /** listening: script read aloud by TTS; the transcript shows only after checking */
  audio_text?: string;
  /** tests only: default lesson for every question/pair/error of this exercise */
  lesson?: number;
}
/** A stage test (data/en/tests/): a mini test after every 5 lessons and the stage exit test. */
export interface EnTest {
  id: string; title_vi: string; stage: number; kind: "mini" | "final"; after_lesson: number; minutes: number; pass_percent: number;
  intro_vi?: string; source: string; status: string;
  sections: Array<{ title_vi: string; exercises: Exercise[] }>;
  writing?: { prompt_vi: string; prompt_en?: string; words: { min: number; max: number } };
}
/** One of the 44 English phonemes (data/en/sounds.yaml). */
export interface Sound {
  id: string; ipa: string; kind: "vowel" | "diphthong" | "consonant"; voiced?: boolean; examples: string[];
  how_vi: string; note_vi: string; pairs: Array<[string, string]>; lesson: number; tot_unit?: number | null;
}
export const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
/** Stage 2+: how to tackle one IELTS task type — procedure, tips, traps, useful language, a worked demo. */
export interface SkillStep {
  type: "skill"; skill: (typeof SKILLS)[number]; title_vi: string; intro_vi: string;
  steps: Array<{ title_vi: string; text_vi: string }>;
  tips?: string[];
  traps?: Array<{ trap_vi: string; fix_vi: string }>;
  phrases?: Array<{ en: string; vi: string; note_vi?: string }>;
  demo?: { title_vi: string; text_en: string; notes: Array<{ label?: string; text_vi: string }> };
}
export type Step =
  | { type: "vocabulary" | "grammar" | "examples"; items: string[] }
  | SkillStep
  | { type: "pronunciation"; notes: Array<{ word?: string; sound?: string; text_vi: string }> }
  | { type: "dialogue"; title_vi?: string; lines: Array<{ speaker: string; text: string; vi: string }> }
  | { type: "exercises"; items: Exercise[] }
  | { type: "homework"; kind: string; prompt_vi: string; prompt_en?: string; words?: { min: number; max: number }; minutes?: number };
export interface Lesson {
  slug: string; number: number; stage: number; title_vi: string; focus?: { grammar?: string | null; skill?: string | null };
  target_band?: string; source: string; status: string; steps: Step[];
}

/** Every parsed item remembers the file it came from (relative to data/en) for messages and search. */
export type Located<T> = T & { file: string };

export interface EnglishData {
  root: string;
  sources: Located<Source>[];
  lexicon: Located<LexEntry>[];
  sentences: Located<Sentence>[];
  grammar: Located<GrammarPoint>[];
  lessons: Located<Lesson>[];
  tests: Located<EnTest>[];
  sounds: Located<Sound>[];
  /** file-level `source` / `status` of sounds.yaml */
  soundsMeta: { source?: string; status?: string };
  /** YAML syntax errors: the file is skipped, validation reports it */
  parseErrors: string[];
}

export const DEFAULT_ROOT = path.resolve(import.meta.dirname, "..", "..", "data", "en");

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).sort().map((f) => path.join(dir, f));
}

export function loadEnglish(root = DEFAULT_ROOT): EnglishData {
  const data: EnglishData = { root, sources: [], lexicon: [], sentences: [], grammar: [], lessons: [], tests: [], sounds: [], soundsMeta: {}, parseErrors: [] };
  const read = (file: string): Record<string, unknown> | null => {
    try {
      return (YAML.parse(readFileSync(file, "utf8")) ?? {}) as Record<string, unknown>;
    } catch (e) {
      data.parseErrors.push(`${path.relative(root, file)}: ${(e as Error).message.split("\n")[0]}`);
      return null;
    }
  };
  const collect = <T>(file: string, key: string, into: Located<T>[]) => {
    const doc = read(file);
    const rel = path.relative(root, file).replaceAll("\\", "/");
    for (const item of (doc?.[key] as T[] | undefined) ?? []) into.push({ ...item, file: rel });
  };
  const sourcesFile = path.join(root, "sources.yaml");
  if (existsSync(sourcesFile)) collect(sourcesFile, "sources", data.sources);
  const soundsFile = path.join(root, "sounds.yaml");
  if (existsSync(soundsFile)) {
    collect(soundsFile, "sounds", data.sounds);
    const doc = read(soundsFile);
    data.soundsMeta = { source: doc?.source as string | undefined, status: doc?.status as string | undefined };
  }
  for (const f of yamlFiles(path.join(root, "lexicon"))) collect(f, "entries", data.lexicon);
  for (const f of yamlFiles(path.join(root, "sentences"))) collect(f, "sentences", data.sentences);
  for (const f of yamlFiles(path.join(root, "grammar"))) collect(f, "points", data.grammar);
  for (const f of yamlFiles(path.join(root, "lessons"))) {
    const doc = read(f);
    if (doc) data.lessons.push({ ...(doc as unknown as Lesson), file: `lessons/${path.basename(f)}` });
  }
  for (const f of yamlFiles(path.join(root, "tests"))) {
    const doc = read(f);
    if (doc) data.tests.push({ ...(doc as unknown as EnTest), file: `tests/${path.basename(f)}` });
  }
  data.lessons.sort((a, b) => a.number - b.number);
  data.tests.sort((a, b) => a.stage - b.stage || a.after_lesson - b.after_lesson || (a.kind === "final" ? 1 : -1));
  return data;
}

const slugOf = (headword: string) => headword.toLowerCase().trim().replace(/\s+/g, "-");

/** Lexicon id → number of the first lesson whose vocabulary step lists it. */
export function firstLesson(data: EnglishData): Map<string, number> {
  const first = new Map<string, number>();
  for (const l of data.lessons)
    for (const s of l.steps ?? [])
      if (s.type === "vocabulary") for (const id of s.items ?? []) if (!first.has(id)) first.set(id, l.number);
  return first;
}

export function validateEnglish(data: EnglishData): { errors: string[]; warnings: string[] } {
  const errors = [...data.parseErrors];
  const warnings: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const warn = (where: string, msg: string) => warnings.push(`${where}: ${msg}`);

  const index = <T extends { file: string }>(items: T[], idOf: (t: T) => string, label: string) => {
    const map = new Map<string, T>();
    for (const it of items) {
      const id = idOf(it);
      if (!id) err(it.file, `${label} missing id`);
      else if (map.has(id)) err(it.file, `duplicate ${label} id ${id} (also in ${map.get(id)!.file})`);
      else map.set(id, it);
    }
    return map;
  };
  const sources = index(data.sources, (s) => s.id, "source");
  const lex = index(data.lexicon, (e) => e.id, "lexicon");
  const sents = index(data.sentences, (s) => s.id, "sentence");
  const gram = index(data.grammar, (g) => g.id, "grammar");
  const lessons = index(data.lessons, (l) => l.slug, "lesson");

  const checkStatus = (where: string, status: string | undefined) => {
    if (!STATUSES.includes(status as never)) err(where, `status must be one of ${STATUSES.join("/")} (got ${status})`);
  };
  /** Content must come from a source that allows importing and publishing. */
  const checkContentSource = (where: string, id: string | undefined) => {
    const s = id ? sources.get(id) : undefined;
    if (!s) return err(where, `unknown source ${id}`);
    if (!s.publishable) err(where, `source ${id} is not publishable (publishable: false)`);
    if (s.usage !== "import") err(where, `source ${id} has usage "${s.usage}" — only "import" sources may supply content`);
  };
  const checkProvenance = (where: string, list: Provenance[] | undefined) => {
    for (const p of list ?? []) if (p.source !== AI_DRAFT && !sources.has(p.source)) err(where, `provenance: unknown source ${p.source}`);
  };

  for (const s of data.sources) {
    const w = `${s.file} ${s.id}`;
    if (!/^[a-z0-9-]+$/.test(s.id ?? "")) err(w, "source id must match [a-z0-9-]+");
    if (s.id === AI_DRAFT) err(w, `"${AI_DRAFT}" is reserved`);
    if (!["import", "fact", "reference"].includes(s.usage)) err(w, "usage must be import/fact/reference");
    if (typeof s.publishable !== "boolean") err(w, "publishable must be true/false");
    if (!s.license) err(w, "license missing (use UNKNOWN when not known)");
    if (s.license === "UNKNOWN" && s.publishable) err(w, "license UNKNOWN cannot be publishable");
    if (s.path && !s.sha256) err(w, "local file needs sha256");
  }

  for (const e of data.lexicon) {
    const w = `${e.file} ${e.id}`;
    const [slug, pos] = (e.id ?? "").split("|");
    if (!POS.includes(pos as never)) err(w, `pos in id must be one of ${POS.join(",")}`);
    if (pos !== e.pos) err(w, `pos "${e.pos}" differs from id`);
    if (slug !== slugOf(e.headword ?? "")) err(w, `id should start with "${slugOf(e.headword ?? "")}|"`);
    const letter = (e.headword ?? "").trim()[0]?.toLowerCase();
    if (letter && /[a-z]/.test(letter) && e.file !== `lexicon/${letter}.yaml`) err(w, `belongs in lexicon/${letter}.yaml`);
    if (!e.meaning_vi?.length) err(w, "meaning_vi is empty");
    if (e.cefr != null && !CEFR.includes(e.cefr as never)) err(w, `cefr must be A1..C2 or null`);
    for (const id of e.word_family ?? []) if (!lex.has(id)) err(w, `word_family: unknown ${id}`);
    if (e.replaced_by && !lex.has(e.replaced_by)) err(w, `replaced_by: unknown ${e.replaced_by}`);
    checkStatus(w, e.status);
    checkContentSource(w, e.source);
    checkProvenance(w, e.provenance);
  }

  for (const s of data.sentences) {
    const w = `${s.file} ${s.id}`;
    if (!/^b\d{2}-\d{3}$/.test(s.id ?? "")) err(w, "sentence id must look like b01-001");
    if (!s.text?.trim() || !s.vi?.trim()) err(w, "text and vi are required");
    for (const id of s.words ?? []) if (!lex.has(id)) err(w, `unknown word ${id}`);
    for (const id of s.grammar ?? []) if (!gram.has(id)) err(w, `unknown grammar point ${id}`);
    // stem without a final e/y/f so taking, studies, shelves still match take, study, shelf
    const stem = (id: string) => { const w = id.split("|")[0]!.split("-")[0]!; return w.length > 3 ? w.replace(/[eyf]$/, "") : w; };
    // irregular forms (met, left, forgot, has to) count as the word too
    const forms = (id: string) => Object.values(lex.get(id)?.forms ?? {}).map((f) => String(f).toLowerCase().split(" ")[0]!);
    for (const id of s.words ?? []) if (id && ![stem(id), ...forms(id)].some((f) => (s.text ?? "").toLowerCase().includes(f)))
      warn(w, `word ${id} does not seem to appear in the text`);
    checkStatus(w, s.status);
    checkContentSource(w, s.source);
  }

  for (const g of data.grammar) {
    const w = `${g.file} ${g.id}`;
    if (!/^en-g\d-\d{2}$/.test(g.id ?? "")) err(w, "grammar id must look like en-g1-01");
    if (!lessons.has(g.lesson)) err(w, `unknown lesson ${g.lesson}`);
    if (!g.title || !g.explain?.trim()) err(w, "title and explain are required");
    for (const id of g.examples ?? []) if (!sents.has(id)) err(w, `unknown sentence ${id}`);
    for (const m of g.mistakes ?? []) if (!m.wrong || !m.right || m.wrong === m.right) err(w, "mistake pair needs different wrong/right");
    if (g.cefr != null && !CEFR.includes(g.cefr as never)) err(w, "cefr must be A1..C2 or null");
    checkStatus(w, g.status);
    checkContentSource(w, g.source);
    checkProvenance(w, g.provenance);
  }

  const sounds = index(data.sounds, (s) => s.id, "sound");
  if (data.sounds.length) {
    checkStatus("sounds.yaml", data.soundsMeta.status);
    checkContentSource("sounds.yaml", data.soundsMeta.source);
  }
  for (const s of data.sounds) {
    const w = `${s.file} ${s.id}`;
    if (!/^snd-[a-z0-9-]+$/.test(s.id ?? "")) err(w, "sound id must look like snd-th");
    if (!["vowel", "diphthong", "consonant"].includes(s.kind)) err(w, "kind must be vowel/diphthong/consonant");
    if (s.kind === "consonant" && typeof s.voiced !== "boolean") err(w, "consonant needs voiced: true/false");
    if (!s.ipa || !s.how_vi || !s.note_vi) err(w, "ipa, how_vi and note_vi are required");
    if (!s.examples?.length) err(w, "needs examples");
    if (!(s.lesson >= 0 && s.lesson <= 80)) err(w, "lesson must be 0..80");
    for (const p of s.pairs ?? []) if (!Array.isArray(p) || p.length !== 2 || p[0] === p[1]) err(w, `bad minimal pair ${JSON.stringify(p)}`);
  }
  const ipas = new Map<string, string>();
  for (const s of data.sounds) {
    if (ipas.has(s.ipa)) err(`${s.file} ${s.id}`, `same ipa as ${ipas.get(s.ipa)}`);
    ipas.set(s.ipa, s.id);
  }

  const first = firstLesson(data);
  const exerciseIds = new Map<string, string>();
  for (const l of data.lessons) {
    const w = l.file;
    const nn = String(l.number).padStart(2, "0");
    if (!new RegExp(`^buoi-${nn}-[a-z0-9-]+$`).test(l.slug ?? "")) err(w, `slug must look like buoi-${nn}-<ten>`);
    if (`lessons/${l.slug}.yaml` !== l.file) err(w, `file name must be ${l.slug}.yaml`);
    if (![1, 2, 3, 4].includes(l.stage)) err(w, "stage must be 1..4");
    if (!l.title_vi) err(w, "title_vi is required");
    checkStatus(w, l.status);
    checkContentSource(w, l.source);
    let lastOrder = -1;
    for (const step of l.steps ?? []) {
      const order = STEP_ORDER.indexOf(step.type as never);
      if (order < 0) { err(w, `unknown step type ${step.type}`); continue; }
      if (order <= lastOrder) err(w, `step ${step.type} is out of order (expected ${STEP_ORDER.join(" → ")})`);
      lastOrder = order;
      const future = (where: string, ids: string[] | undefined) => {
        for (const id of ids ?? []) {
          const n = first.get(id);
          if (n !== undefined && n > l.number) warn(where, `uses ${id}, first taught in buổi ${n} (future vocabulary)`);
        }
      };
      if (step.type === "vocabulary") for (const id of step.items ?? []) { if (!lex.has(id)) err(w, `vocabulary: unknown ${id}`); }
      if (step.type === "grammar") for (const id of step.items ?? []) {
        const g = gram.get(id);
        if (!g) err(w, `grammar: unknown ${id}`);
        else if (g.lesson !== l.slug && lessons.get(g.lesson)!.number > l.number) warn(w, `grammar ${id} belongs to a later lesson`);
      }
      if (step.type === "examples") for (const id of step.items ?? []) {
        const s = sents.get(id);
        if (!s) err(w, `examples: unknown ${id}`);
        else { future(`${w} ${id}`, s.words); if (s.status === "retired") warn(w, `examples: ${id} is retired`); }
      }
      if (step.type === "pronunciation") for (const n of step.notes ?? []) {
        if (n.word && !lex.has(n.word)) err(w, `pronunciation: unknown ${n.word}`);
        if (n.sound && !sounds.has(n.sound)) err(w, `pronunciation: unknown sound ${n.sound}`);
      }
      if (step.type === "dialogue") for (const [i, line] of (step.lines ?? []).entries()) if (!line.text || !line.vi) err(w, `dialogue line ${i + 1} needs text and vi`);
      if (step.type === "skill") {
        if (!SKILLS.includes(step.skill as never)) err(w, `skill must be one of ${SKILLS.join("/")}`);
        if (!step.title_vi || !step.intro_vi?.trim()) err(w, "skill needs title_vi and intro_vi");
        if (!step.steps?.length) err(w, "skill needs steps");
        for (const [i, s] of (step.steps ?? []).entries()) if (!s.title_vi || !s.text_vi) err(w, `skill step ${i + 1} needs title_vi and text_vi`);
        for (const [i, t] of (step.traps ?? []).entries()) if (!t.trap_vi || !t.fix_vi) err(w, `skill trap ${i + 1} needs trap_vi and fix_vi`);
        for (const [i, p] of (step.phrases ?? []).entries()) if (!p.en || !p.vi) err(w, `skill phrase ${i + 1} needs en and vi`);
        if (step.demo && (!step.demo.text_en || !step.demo.notes?.length)) err(w, "skill demo needs text_en and notes");
      }
      if (step.type === "homework" && !step.prompt_vi) err(w, "homework needs prompt_vi");
      if (step.type === "exercises") for (const ex of step.items ?? []) {
        const we = `${w} ${ex.id}`;
        if (!/^b\d{2}-x\d+$/.test(ex.id ?? "")) err(we, "exercise id must look like b01-x1");
        else if (exerciseIds.has(ex.id)) err(we, `duplicate exercise id (also in ${exerciseIds.get(ex.id)})`);
        else exerciseIds.set(ex.id, w);
        if (!(ex.bank_no >= 1 && ex.bank_no <= 33)) err(we, "bank_no must be 1..33 (ngan-hang-bai-tap.md)");
        if (!ex.instructions_vi) err(we, "instructions_vi is required");
        checkExercise(we, ex, err);
      }
    }
  }

  const testExerciseIds = new Set<string>();
  const lessonNumbers = new Set(data.lessons.map((l) => l.number));
  for (const t of data.tests) {
    const w = `${t.file} ${t.id}`;
    if (!/^gd\d-(mini-\d|final)$/.test(t.id ?? "")) err(w, "test id must look like gd1-mini-1 or gd1-final");
    if (`tests/${t.id}.yaml` !== t.file) err(w, `file name must be ${t.id}.yaml`);
    if (!["mini", "final"].includes(t.kind)) err(w, "kind must be mini/final");
    if (!(t.minutes > 0) || !(t.pass_percent > 0 && t.pass_percent <= 100)) err(w, "minutes and pass_percent are required");
    if (!lessonNumbers.has(t.after_lesson)) err(w, `after_lesson ${t.after_lesson} is not a lesson`);
    checkStatus(w, t.status);
    checkContentSource(w, t.source);
    const idPattern = new RegExp(`^${t.id}-x\\d+$`);
    for (const sec of t.sections ?? []) for (const ex of sec.exercises ?? []) {
      const we = `${w} ${ex.id}`;
      if (!idPattern.test(ex.id ?? "")) err(we, `exercise id must look like ${t.id}-x1`);
      else if (testExerciseIds.has(ex.id)) err(we, "duplicate exercise id");
      testExerciseIds.add(ex.id);
      if (ex.kind.startsWith("speaking")) err(we, "speaking exercises cannot be auto-graded in a test");
      checkExercise(we, ex, err);
      const tags = [ex.lesson, ...(ex.questions ?? []).map((q) => q.lesson), ...(ex.errors ?? []).map((e) => e.lesson)].filter((n): n is number => n !== undefined);
      for (const n of tags) if (!lessonNumbers.has(n) || n > t.after_lesson) err(we, `lesson tag ${n} must be a lesson ≤ ${t.after_lesson}`);
      const untagged = ex.kind === "error-correction" ? (ex.errors ?? []).some((e) => e.lesson === undefined) : !(ex.questions ?? []).length || (ex.questions ?? []).some((q) => q.lesson === undefined);
      if (ex.lesson === undefined && untagged)
        err(we, "every question needs a lesson tag (exercise.lesson or question.lesson)");
    }
  }

  const used = new Set(first.keys());
  for (const e of data.lexicon) if (!used.has(e.id) && e.status !== "retired") warn(`${e.file} ${e.id}`, "not in any lesson vocabulary");
  return { errors, warnings };
}

function checkExercise(w: string, ex: Exercise, err: (where: string, msg: string) => void) {
  const qs = ex.questions ?? [];
  switch (ex.kind) {
    case "match-definition":
    case "collocation":
      if (!ex.pairs?.length) err(w, "needs pairs");
      return;
    case "error-correction":
      if (!ex.text || !ex.errors?.length) err(w, "needs text and errors");
      for (const e of ex.errors ?? []) if (ex.text && !ex.text.includes(e.wrong)) err(w, `error "${e.wrong}" not found in text`);
      return;
    case "dictation":
      if (!ex.text) err(w, "needs text");
      return;
    case "speaking-part1":
    case "speaking-part3":
      if (!qs.length) err(w, "needs questions");
      return;
    case "speaking-part2":
      if (!ex.cue_card?.points?.length) err(w, "needs cue_card");
      return;
    case "gap-fill":
    case "verb-form":
    case "word-form":
    case "paraphrase":
    case "transformation":
    case "combine":
    case "mcq":
    case "tfng":
    case "ynng":
    case "tf":
    case "completion":
      break;
    default:
      return err(w, `unknown kind ${ex.kind}`);
  }
  if (!qs.length) err(w, "needs questions");
  if (["tfng", "ynng", "tf", "completion"].includes(ex.kind) && !ex.passage && !ex.audio_text) err(w, "needs passage (or audio_text for listening)");
  if (ex.kind === "completion" && ex.audio_text && !ex.passage) err(w, "listening completion needs the form/notes as passage");
  const allowed = ex.kind === "tfng" ? ["T", "F", "NG"] : ex.kind === "ynng" ? ["Y", "N", "NG"] : ex.kind === "tf" ? ["T", "F"] : null;
  for (const [i, q] of qs.entries()) {
    const wq = `${w} q${i + 1}`;
    if (!q.q) err(wq, "q is required");
    if (q.answer === undefined || q.answer === "") { err(wq, "answer is required"); continue; }
    if (allowed && !allowed.includes(String(q.answer))) err(wq, `answer must be ${allowed.join("/")}`);
    if (ex.kind === "mcq") {
      const n = q.options?.length ?? 0;
      if (n < 2) err(wq, "mcq needs options");
      const a = q.answer;
      const ok = typeof a === "number" ? a >= 0 && a < n : /^[a-z]$/i.test(a) && a.toLowerCase().charCodeAt(0) - 97 < n;
      if (!ok) err(wq, "mcq answer must be a letter or 0-based index within options");
    }
    if ((ex.kind === "gap-fill" || ex.kind === "verb-form") && !q.q?.includes("___")) err(wq, 'q needs a "___" gap');
    if (ex.kind === "gap-fill" && ex.bank && !ex.bank.includes(String(q.answer))) err(wq, "answer is not in the word bank");
  }
}

// ── search ──────────────────────────────────────────────────────────────────

/** Lowercase, strip Vietnamese diacritics, so "gia dinh" finds "gia đình". */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

export interface Hit { type: "lexicon" | "sentence" | "grammar" | "lesson" | "source" | "sound"; id: string; file: string; status?: string; text: string }

export function searchEnglish(data: EnglishData, query: string): Hit[] {
  const q = fold(query.trim());
  if (!q) return [];
  const hits: Hit[] = [];
  const match = (parts: Array<string | null | undefined>) => parts.filter(Boolean).find((p) => fold(p!).includes(q));
  const add = (type: Hit["type"], id: string, file: string, status: string | undefined, parts: Array<string | null | undefined>, label: string) => {
    const m = match([id, ...parts]);
    if (m) hits.push({ type, id, file, status, text: label.includes(m) ? label : `${label} — …${m}` });
  };
  for (const e of data.lexicon) {
    const label = `${e.headword} (${e.pos}) ${e.ipa?.uk ?? ""} ${e.meaning_vi?.join("; ") ?? ""}`.replace(/\s+/g, " ");
    add("lexicon", e.id, e.file, e.status, [label, ...(e.collocations ?? []), ...(e.notes_vi ?? []), ...(e.topics ?? []), e.definition_en], label);
  }
  for (const s of data.sentences) add("sentence", s.id, s.file, s.status, [`${s.text} | ${s.vi}`], `${s.text} | ${s.vi}`);
  for (const g of data.grammar) add("grammar", g.id, g.file, g.status, [g.title, ...(g.structures ?? []), g.explain, ...(g.notes ?? []), ...(g.mistakes ?? []).flatMap((m) => [m.wrong, m.right])], g.title);
  for (const l of data.lessons) {
    const parts: string[] = [l.title_vi, l.focus?.grammar ?? "", l.focus?.skill ?? ""];
    for (const s of l.steps ?? []) {
      if (s.type === "dialogue") for (const line of s.lines ?? []) parts.push(`${line.text} | ${line.vi}`);
      if (s.type === "pronunciation") for (const n of s.notes ?? []) parts.push(n.text_vi);
      if (s.type === "homework") parts.push(s.prompt_vi, s.prompt_en ?? "");
      if (s.type === "skill") {
        parts.push(s.title_vi, s.intro_vi, ...(s.steps ?? []).map((x) => `${x.title_vi}: ${x.text_vi}`), ...(s.tips ?? []));
        parts.push(...(s.traps ?? []).map((t) => `${t.trap_vi} → ${t.fix_vi}`), ...(s.phrases ?? []).map((p) => `${p.en} | ${p.vi}`), s.demo?.text_en ?? "");
      }
      if (s.type === "exercises") for (const ex of s.items ?? []) {
        parts.push(`[${ex.id}] ${ex.instructions_vi}`, ex.passage ?? "", ex.text ?? "");
        for (const qq of ex.questions ?? []) parts.push(`[${ex.id}] ${qq.q ?? ""} → ${qq.answer ?? ""}`);
      }
    }
    add("lesson", l.slug, l.file, l.status, parts, `Buổi ${l.number} · ${l.title_vi}`);
  }
  for (const s of data.sounds) {
    const label = `/${s.ipa}/ ${s.examples.join(", ")} (buổi ${s.lesson})`;
    add("sound", s.id, s.file, data.soundsMeta.status, [label, s.how_vi, s.note_vi, ...(s.pairs ?? []).map((p) => p.join("–"))], label);
  }
  for (const s of data.sources) add("source", s.id, s.file, undefined, [s.name, s.license, s.url, s.path], `${s.name} [${s.license}; ${s.usage}; publishable=${s.publishable}]`);
  return hits;
}
