/**
 * `pnpm en:grade:try <buổi số | slug> <bài.txt> [--model gemini-3.8-flash] [--json]` — grade one homework on this
 * machine with the same prompt as the `grade-writing` Edge Function, to check grading quality before deploying.
 * Needs GEMINI_API_KEY in .env.local (free key from aistudio.google.com — never commit it, never paste it in chat).
 */
import { existsSync, readFileSync } from "node:fs";
import { enLessons, enStep } from "@/content/en";
import { CRITERIA_VI, DEFAULT_MODELS, grade, PERSONAL_ERRORS, type HomeworkKind } from "../supabase/functions/grade-writing/grader";

const env = existsSync(".env.local")
  ? Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]))
  : {};
const apiKey = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? "";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const model = flag("--model");
const asJson = args.includes("--json");
const [which, file] = args.filter((a) => !a.startsWith("--"));
if (!which || !file) {
  console.error("Usage: pnpm en:grade:try <buổi số | slug> <bài.txt> [--model <id>] [--json]");
  process.exit(1);
}
if (!apiKey) {
  console.error("Thiếu GEMINI_API_KEY trong .env.local (tạo khóa miễn phí ở aistudio.google.com).");
  process.exit(1);
}

const lessons = enLessons();
const lesson = lessons.find((l) => l.slug === which || String(l.number) === which);
if (!lesson) throw new Error(`No lesson ${which}`);
const hw = enStep(lesson, "homework");
if (!hw) throw new Error(`Buổi ${lesson.number} has no homework`);

const started = Date.now();
const { result, model: used } = await grade(
  {
    kind: hw.kind as HomeworkKind,
    lesson: { number: lesson.number, title: lesson.title_vi, grammar: lesson.focus?.grammar ?? null },
    prompt_vi: hw.prompt_vi,
    prompt_en: hw.prompt_en,
    words: hw.words,
    text: readFileSync(file, "utf8"),
    syllabus: lessons.filter((l) => l.number <= lesson.number && l.focus?.grammar).map((l) => ({ n: l.number, grammar: l.focus!.grammar! })),
  },
  model ? [model] : DEFAULT_MODELS,
  apiKey,
);

if (asJson) {
  console.log(JSON.stringify({ model: used, result }, null, 2));
} else {
  console.log(`Buổi ${lesson.number} · ${hw.kind} · ${result.word_count} từ · ${used} · ${((Date.now() - started) / 1000).toFixed(0)} giây\n`);
  console.log(`BAND TỔNG ${result.overall.toFixed(1)}  (${result.criteria.map((c) => `${c.code} ${c.band.toFixed(1)}`).join(" · ")})\n`);
  console.log(result.summary_vi + "\n");
  for (const c of result.checklist) console.log(`${c.done ? "✓" : "✗"} ${c.point_vi} — ${c.note_vi}`);
  for (const c of result.criteria) {
    console.log(`\n${CRITERIA_VI[c.code]} ${c.band.toFixed(1)}: ${c.comment_vi}\n  (${c.descriptor_vi})`);
    for (const p of c.good) console.log(`  ✓ ${p.point_vi}${p.quote ? ` «${p.quote}»` : ""}`);
    for (const p of c.bad) console.log(`  ✗ ${p.point_vi}${p.quote ? ` «${p.quote}»` : ""}`);
    if (c.next_vi) console.log(`  → ${c.next_vi}`);
  }
  console.log(`\nLỖI (${result.errors.length})`);
  for (const e of result.errors) {
    const tags = [e.personal && `lỗi quen: ${PERSONAL_ERRORS[e.personal]}`, e.lesson && `Buổi ${e.lesson}`].filter(Boolean).join(", ");
    console.log(`- ${e.wrong}  →  ${e.right}\n    ${e.why_vi}${tags ? ` [${tags}]` : ""}`);
  }
  console.log(`\nNÂNG CẤP CÂU`);
  for (const u of result.upgrades) {
    console.log(`- ${u.original}\n  → ${u.better}`);
    for (const c of u.changes) console.log(`    ${c.from} → ${c.to}: ${c.why_vi}`);
  }
  console.log(`\nBẢN SỬA\n${result.corrected}\n`);
  console.log(`ƯU ĐIỂM\n${result.strengths.map((s) => `- [${s.type}] ${s.quote} — ${s.note_vi}`).join("\n")}\n`);
  console.log(`TỪ VỰNG NÂNG BAND\n${result.vocabulary.map((v) => `- ${v.phrase}${v.replaces ? ` (thay cho "${v.replaces}")` : ""}: ${v.meaning_vi} — ${v.example}`).join("\n")}\n`);
  console.log(`LÊN ${result.next_band.target.toFixed(1)}`);
  for (const s of result.next_band.steps) console.log(`- [${s.criterion ?? "?"}] ${s.action_vi}${s.before || s.after ? `\n    ${s.before} → ${s.after}` : ""}`);
  for (const s of result.next_band.structures) console.log(`  CẤU TRÚC ${s.structure}: ${s.use_vi} — ${s.example}`);
  console.log("");
  console.log(`BÀI MẪU\n${result.sample}\n`);
  console.log(`ĐIỂM NGHẼN: ${result.weakest_vi}\n`);
  result.actions_vi.forEach((a, i) => console.log(`${i + 1}. ${a}`));
}
