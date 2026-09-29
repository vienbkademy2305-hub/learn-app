import Link from "next/link";
import { Badge } from "@/components/Badge";
import type { EnGrammar, EnSentence, EnSound, EnWord, SkillStep } from "@/content/en-types";
import { Say } from "./speech";

const POS_VI: Record<string, string> = {
  n: "danh từ", v: "động từ", adj: "tính từ", adv: "trạng từ", prep: "giới từ", conj: "liên từ", pron: "đại từ",
  det: "hạn định từ", num: "số từ", "phr-n": "cụm danh từ", "phr-v": "cụm động từ", idiom: "thành ngữ", colloc: "cụm từ cố định",
};
export const posVi = (pos: string) => POS_VI[pos] ?? pos;

export function Ipa({ word }: { word: EnWord }) {
  const uk = word.ipa?.uk;
  const us = word.ipa?.us;
  if (!uk && !us) return null;
  return (
    <span className="inline-flex flex-wrap gap-x-3 font-mono text-sm text-stone-600">
      {uk && (
        <span title="Anh-Anh" className="whitespace-nowrap">
          <span className="font-sans text-[10px] font-semibold text-stone-400">UK</span> {uk}
        </span>
      )}
      {us && us !== uk && (
        <span title="Anh-Mỹ" className="whitespace-nowrap">
          <span className="font-sans text-[10px] font-semibold text-stone-400">US</span> {us}
        </span>
      )}
    </span>
  );
}

export function EnWordCard({ word, example }: { word: EnWord; example?: EnSentence }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/en/word/${word.slug}`} className="text-xl font-bold text-stone-900 hover:text-sky-800" lang="en">
            {word.headword}
          </Link>
          <span className="ml-2 text-xs text-stone-400">{posVi(word.pos)}</span>
          {word.cefr && <Badge tone="jade" className="ml-2 align-middle">{word.cefr}</Badge>}
          <div>
            <Ipa word={word} />
          </div>
        </div>
        <Say text={word.headword} slow />
      </div>
      <p className="mt-2 font-medium text-stone-800">{word.meaning_vi.join("; ")}</p>
      {word.stress && <p className="mt-1 text-xs text-stone-500">Trọng âm: <span className="font-semibold">{word.stress}</span></p>}
      {word.forms && Object.keys(word.forms).length > 0 && (
        <p className="mt-1 text-xs text-stone-500" lang="en">
          {Object.entries(word.forms).map(([k, v]) => `${FORM_VI[k] ?? k}: ${v}`).join(" · ")}
        </p>
      )}
      {example && (
        <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-600">
          <span lang="en" className="text-stone-800">{example.text}</span>
          <br />
          <span className="text-stone-500">{example.vi}</span>
        </p>
      )}
      {word.notes_vi?.[0] && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ {word.notes_vi[0]}</p>}
    </article>
  );
}

const FORM_VI: Record<string, string> = {
  plural: "số nhiều", past: "quá khứ", pp: "phân từ II", ing: "V-ing", "3sg": "ngôi 3", comparative: "so sánh hơn", superlative: "so sánh nhất",
};

/** Bold the lesson's words inside an English sentence (best effort, whole-word match on the headword). */
function highlight(text: string, heads: string[]) {
  if (!heads.length) return text;
  const re = new RegExp(`\\b(${heads.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
  return text.split(re).map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-sky-900">{part}</strong> : part));
}

export function EnSentenceRow({ sentence, heads = [] }: { sentence: EnSentence; heads?: string[] }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <p lang="en" className="text-lg text-stone-900">{highlight(sentence.text, heads)}</p>
        <p className="mt-1 text-stone-500">{sentence.vi}</p>
      </div>
      <Say text={sentence.text} slow />
    </li>
  );
}

export function EnGrammarCard({ point, examples }: { point: EnGrammar; examples: EnSentence[] }) {
  return (
    <article className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-stone-900">{point.title}</h2>
      {point.structures && (
        <ul className="space-y-1.5">
          {point.structures.map((s) => (
            <li key={s} className="rounded-lg bg-sky-50 px-3 py-2 font-mono text-sm text-sky-950">{s}</li>
          ))}
        </ul>
      )}
      <p className="leading-relaxed text-stone-700">{point.explain}</p>
      {point.table && point.table.length > 1 && (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr>{point.table[0]!.map((h, i) => <th key={i} className="border-b border-stone-300 px-3 py-2 text-left font-semibold text-stone-700">{h}</th>)}</tr>
            </thead>
            <tbody>
              {point.table.slice(1).map((row, r) => (
                <tr key={r} className="odd:bg-stone-50">
                  {row.map((c, i) => <td key={i} className="border-b border-stone-100 px-3 py-2 text-stone-800">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {point.notes && point.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
          {point.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
      {point.mistakes && point.mistakes.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Lỗi người Việt hay mắc</h3>
          <ul className="mt-2 space-y-2">
            {point.mistakes.map((m) => (
              <li key={m.wrong} className="rounded-xl bg-stone-50 p-3 text-sm">
                <p lang="en" className="text-red-700 line-through decoration-red-300">✗ {m.wrong}</p>
                <p lang="en" className="font-medium text-jade-700">✓ {m.right}</p>
                <p className="mt-1 text-stone-500">{m.why}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {examples.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Ví dụ</h3>
          <ul className="mt-2 space-y-2">
            {examples.map((s) => <EnSentenceRow key={s.id} sentence={s} />)}
          </ul>
        </div>
      )}
      {point.status === "draft" && <Badge tone="amber">Bản nháp — chờ duyệt</Badge>}
    </article>
  );
}

export function EnSoundCard({ sound, note }: { sound: EnSound; note?: string }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid min-w-14 place-items-center rounded-xl bg-sky-700 px-3 py-2 font-mono text-2xl text-white">/{sound.ipa}/</span>
        <div className="flex flex-wrap gap-2" lang="en">
          {sound.examples.slice(0, 5).map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-3 pr-0.5 text-sm">
              {w} <Say text={w} />
            </span>
          ))}
        </div>
      </div>
      {note && <p className="mt-3 font-medium text-stone-800">{note}</p>}
      <p className="mt-2 text-sm text-stone-600"><span className="font-semibold">Cách phát âm:</span> {sound.how_vi}</p>
      {sound.note_vi && <p className="mt-1 text-sm text-amber-800">⚠ {sound.note_vi}</p>}
      {sound.pairs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Cặp từ dễ nhầm — nghe và phân biệt</p>
          <ul className="mt-2 flex flex-wrap gap-2" lang="en">
            {sound.pairs.slice(0, 6).map(([a, b]) => (
              <li key={`${a}-${b}`} className="inline-flex items-center gap-1 rounded-xl bg-white px-2 py-1 text-sm ring-1 ring-stone-200">
                {a} <Say text={a} /> <span className="text-stone-300">|</span> {b} <Say text={b} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

const SKILL_VI: Record<SkillStep["skill"], string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };

/** The skill step of a stage 2+ lesson. */
export function EnSkillCard({ skill, draft }: { skill: SkillStep; draft: boolean }) {
  return (
    <article className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">{SKILL_VI[skill.skill]}</p>
        <h2 className="text-xl font-bold text-stone-900">{skill.title_vi}</h2>
        <p className="mt-2 leading-relaxed whitespace-pre-line text-stone-700">{skill.intro_vi}</p>
      </div>

      <div>
        <h3 className="font-semibold text-stone-900">Các bước làm bài</h3>
        <ol className="mt-2 space-y-2">
          {skill.steps.map((s, i) => (
            <li key={s.title_vi} className="flex gap-3 rounded-xl bg-sky-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-800 text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-sky-950">{s.title_vi}</p>
                <p className="mt-0.5 leading-relaxed whitespace-pre-line text-stone-700">{s.text_vi}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {skill.tips && skill.tips.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Mẹo</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
            {skill.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      )}

      {skill.traps && skill.traps.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Bẫy thường gặp</h3>
          <ul className="mt-2 space-y-2">
            {skill.traps.map((t) => (
              <li key={t.trap_vi} className="rounded-xl bg-stone-50 p-3 text-sm">
                <p className="text-red-700">⚠ {t.trap_vi}</p>
                <p className="mt-1 text-jade-700">→ {t.fix_vi}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skill.phrases && skill.phrases.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Cụm từ / mẫu câu dùng được</h3>
          <ul className="mt-2 divide-y divide-stone-100">
            {skill.phrases.map((p) => (
              <li key={p.en} className="flex items-start gap-2 py-2 text-sm">
                <Say text={p.en} />
                <div className="min-w-0">
                  <p lang="en" className="font-medium text-stone-900">{p.en}</p>
                  <p className="text-stone-600">{p.vi}</p>
                  {p.note_vi && <p className="text-xs text-stone-500">{p.note_vi}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {skill.demo && (
        <div className="space-y-3">
          <h3 className="font-semibold text-stone-900">{skill.demo.title_vi}</h3>
          <p lang="en" className="overflow-x-auto rounded-xl bg-stone-50 p-4 leading-relaxed whitespace-pre-wrap text-stone-800">{skill.demo.text_en}</p>
          <ul className="space-y-2">
            {skill.demo.notes.map((n, i) => (
              <li key={i} className="rounded-xl border border-sky-100 p-3 text-sm">
                {n.label && <p lang="en" className="font-semibold text-sky-900">{n.label}</p>}
                <p className="leading-relaxed whitespace-pre-line text-stone-700">{n.text_vi}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {draft && <Badge tone="amber">Bản nháp — chờ duyệt</Badge>}
    </article>
  );
}
