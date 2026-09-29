/**
 * Merge one lesson bundle into data/en/ (skill english-content). A bundle is a YAML file with
 * `lexicon`, `sentences`, `grammar`, `lesson`; defaults (draft, editorial, ai-draft provenance) are filled in.
 *   pnpm en:merge <bundle.yaml> [--dry]
 * Existing ids are never overwritten: the merge stops and lists them.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { DEFAULT_ROOT, loadEnglish } from "../importers/en/load";

type Obj = Record<string, unknown>;
const [file, ...flags] = process.argv.slice(2);
if (!file) throw new Error("usage: pnpm en:merge <bundle.yaml> [--dry]");
const dry = flags.includes("--dry");
const bundle = YAML.parse(readFileSync(file, "utf8")) as { lexicon?: Obj[]; sentences?: Obj[]; grammar?: Obj[]; lesson: Obj };
const lesson = bundle.lesson;
const nn = String(lesson.number).padStart(2, "0");
const data = loadEnglish();

const clash = [
  ...(bundle.lexicon ?? []).filter((e) => data.lexicon.some((x) => x.id === e.id)).map((e) => `lexicon ${e.id}`),
  ...(bundle.sentences ?? []).filter((s) => data.sentences.some((x) => x.id === s.id)).map((s) => `sentence ${s.id}`),
  ...(bundle.grammar ?? []).filter((g) => data.grammar.some((x) => x.id === g.id)).map((g) => `grammar ${g.id}`),
  ...(data.lessons.some((l) => l.number === lesson.number) ? [`lesson ${nn}`] : []),
];
if (clash.length) throw new Error(`already exist:\n  ${clash.join("\n  ")}`);
// A comma inside `[a (b, c)]` splits the flow list item: quote such strings in the bundle.
const unbalanced = (bundle.lexicon ?? []).flatMap((e) =>
  (["meaning_vi", "collocations", "notes_vi"] as const).flatMap((k) => ((e[k] as string[] | undefined) ?? [])
    .filter((s) => (s.match(/\(/g) ?? []).length !== (s.match(/\)/g) ?? []).length).map((s) => `${e.id} ${k}: ${s}`)));
if (unbalanced.length) throw new Error(`unbalanced parentheses (quote the item):\n  ${unbalanced.join("\n  ")}`);

const block = (items: Obj[]) =>
  YAML.stringify(items, { lineWidth: 0, flowCollectionPadding: true })
    .split("\n").map((l) => (l ? `  ${l}` : l)).join("\n");

const lexByLetter = new Map<string, Obj[]>();
for (const e of bundle.lexicon ?? []) {
  const full: Obj = {
    id: e.id, headword: e.headword, pos: e.pos, ...(e.forms ? { forms: e.forms } : {}),
    ipa: e.ipa ?? null, ...(e.stress ? { stress: e.stress } : {}), cefr: e.cefr ?? null, meaning_vi: e.meaning_vi,
    ...(e.collocations ? { collocations: e.collocations } : {}), ...(e.notes_vi ? { notes_vi: e.notes_vi } : {}),
    topics: e.topics ?? [], source: "editorial",
    provenance: e.provenance ?? [{ source: "ai-draft", field: "ipa" }, { source: "ai-draft", field: "meaning_vi" }],
    status: "draft",
  };
  const letter = String(e.headword).trim()[0]!.toLowerCase();
  lexByLetter.set(letter, [...(lexByLetter.get(letter) ?? []), full]);
}

const writes: Array<[string, string]> = [];
for (const [letter, items] of lexByLetter) {
  const f = path.join(DEFAULT_ROOT, "lexicon", `${letter}.yaml`);
  const head = existsSync(f)
    ? readFileSync(f, "utf8").replace(/\s*$/, "\n")
    : `# Từ vựng chữ "${letter}". IPA do Claude điền (ai-draft), CEFR chưa tra (UNRESOLVED) — cần research.\nentries:\n`;
  writes.push([f, head + block(items)]);
}

if (bundle.sentences?.length) {
  const lines = bundle.sentences.map((s) => {
    const full = { id: s.id, text: s.text, vi: s.vi, words: s.words ?? [], grammar: s.grammar ?? [], cefr: s.cefr ?? null,
      audio: { tts: true }, source: "editorial", status: "draft" };
    return `  - ${YAML.stringify(full, { collectionStyle: "flow", lineWidth: 0, flowCollectionPadding: true }).trim()}`;
  });
  writes.push([path.join(DEFAULT_ROOT, "sentences", `buoi-${nn}.yaml`),
    `# Câu xuất hiện lần đầu ở Buổi ${lesson.number}. Tự soạn (editorial), BẢN NHÁP chờ duyệt.\nsentences:\n${lines.join("\n")}\n`]);
}

if (bundle.grammar?.length) {
  const f = path.join(DEFAULT_ROOT, "grammar", `giai-doan-${lesson.stage ?? 1}.yaml`);
  const items = bundle.grammar.map((g) => ({ ...g, cefr: g.cefr ?? null, source: "editorial", provenance: g.provenance ?? [], status: "draft" }));
  writes.push([f, readFileSync(f, "utf8").replace(/\s*$/, "\n") + block(items)]);
}

const fullLesson = { slug: lesson.slug, number: lesson.number, stage: lesson.stage ?? 1, title_vi: lesson.title_vi,
  focus: lesson.focus, target_band: lesson.target_band ?? "4.0-5.0", source: "editorial", status: "draft", steps: lesson.steps };
writes.push([path.join(DEFAULT_ROOT, "lessons", `${lesson.slug}.yaml`),
  `# Buổi ${lesson.number} — ${lesson.title_vi}. Tự soạn theo lo-trinh-ielts-6.5.md. BẢN NHÁP chờ duyệt.\n` +
  YAML.stringify(fullLesson, { lineWidth: 0, flowCollectionPadding: true })]);

for (const [f, text] of writes) {
  console.log(`${dry ? "[dry] " : ""}write ${path.relative(DEFAULT_ROOT, f)}`);
  if (!dry) writeFileSync(f, text, "utf8");
}
