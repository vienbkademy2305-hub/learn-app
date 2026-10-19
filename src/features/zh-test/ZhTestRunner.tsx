"use client";
/**
 * Runs one Chinese practice test (data/zh-tests): answer everything, submit once, then the score per section,
 * pass or not, and every item marked with the right answer (and the transcript of what was played).
 * Attempts are kept in this browser only (localStorage), the best and the last few.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  answerKey,
  spokenText,
  summarizeZhTest,
  type ZhAnswer,
  type ZhTest,
  type ZhTestItem,
  type ZhTestPart,
  type ZhTestSummary,
} from "@/domain/zh-test";
import { speakChinese, stopSpeaking } from "@/features/audio/speech";

const KEY = "chinese-app:zh-tests:v1";
type Attempt = { at: string; percent: number; correct: number; total: number; passed: boolean };

function readAttempts(id: string): Attempt[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Attempt[]>;
    return all[id] ?? [];
  } catch {
    return [];
  }
}
function saveAttempt(id: string, a: Attempt) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Attempt[]>;
    all[id] = [a, ...(all[id] ?? [])].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage blocked: the result is still shown
  }
}

const LETTERS = "ABCDEF";
const han = "font-han";

export function ZhTestRunner({ test }: { test: ZhTest }) {
  const [phase, setPhase] = useState<"intro" | "doing" | "done">("intro");
  const [answers, setAnswers] = useState<Record<string, ZhAnswer>>({});
  const [summary, setSummary] = useState<ZhTestSummary | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => setAttempts(readAttempts(test.id)), [test.id]);
  useEffect(() => () => stopSpeaking(), []);

  const total = useMemo(() => test.sections.reduce((n, s) => n + s.parts.reduce((m, p) => m + p.items.length, 0), 0), [test]);
  const answered = Object.values(answers).filter((v) => v !== undefined && v !== "").length;
  const set = (partId: string, i: number, v: ZhAnswer) => setAnswers((a) => ({ ...a, [answerKey(partId, i)]: v }));

  const submit = () => {
    stopSpeaking();
    const s = summarizeZhTest(test, answers);
    setSummary(s);
    setPhase("done");
    const a = { at: new Date().toISOString(), percent: s.percent, correct: s.correct, total: s.total, passed: s.passed };
    saveAttempt(test.id, a);
    setAttempts((x) => [a, ...x].slice(0, 10));
    window.scrollTo({ top: 0 });
  };
  const restart = () => {
    setAnswers({});
    setSummary(null);
    setPhase("doing");
    window.scrollTo({ top: 0 });
  };

  const best = attempts.reduce((m, a) => Math.max(m, a.percent), 0);

  if (phase === "intro")
    return (
      <div className="space-y-4">
        <p className="text-stone-600">{test.intro_vi}</p>
        <p className="text-sm text-stone-500">
          {total} câu · khoảng {test.minutes} phút · đạt từ {test.pass_percent}%
          {attempts.length > 0 && ` · tốt nhất ${best}% (${attempts.length} lần làm)`}
        </p>
        <button onClick={() => setPhase("doing")} className="min-h-12 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white active:bg-brand-700">
          Bắt đầu làm bài
        </button>
      </div>
    );

  const done = phase === "done" && summary;
  return (
    <div className="space-y-8" ref={top}>
      {done && (
        <section className={`rounded-2xl p-5 ring-1 ring-inset ${summary.passed ? "bg-jade-50 ring-jade-100" : "bg-amber-50 ring-amber-200"}`}>
          <p className="text-3xl font-bold text-stone-900">
            {summary.correct}/{summary.total} <span className="text-xl">({summary.percent}%)</span>
          </p>
          <p className="mt-1 font-medium text-stone-800">{summary.passed ? "Đạt! 🎉" : `Chưa đạt (cần ${test.pass_percent}%) — xem lại các câu sai bên dưới.`}</p>
          <ul className="mt-3 grid gap-1 text-sm text-stone-700 sm:grid-cols-3">
            {summary.bySection.map((s) => (
              <li key={s.id}>
                {s.title_vi.replace(/ \(.*\)/, "")}: <strong>{s.correct}/{s.total}</strong>
              </li>
            ))}
          </ul>
          <button onClick={restart} className="mt-4 min-h-11 rounded-xl bg-white px-4 py-2 font-semibold text-stone-800 ring-1 ring-stone-300">
            Làm lại
          </button>
        </section>
      )}

      {test.sections.map((section) => (
        <section key={section.id} className="space-y-6">
          <h2 className="border-b border-stone-200 pb-1 text-xl font-bold text-stone-900">{section.title_vi}</h2>
          {section.parts.map((part) => (
            <PartView key={part.id} part={part} answers={answers} onAnswer={set} marks={done ? summary.marks[part.id] : undefined} />
          ))}
        </section>
      ))}

      {phase === "doing" && (
        <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center justify-between gap-3 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:bottom-0">
          <span className="text-sm text-stone-600">
            Đã làm {answered}/{total}
          </span>
          <button
            onClick={() => (answered === total || window.confirm(`Còn ${total - answered} câu chưa làm. Nộp bài?`)) && submit()}
            className="min-h-11 rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white active:bg-brand-700"
          >
            Nộp bài
          </button>
        </div>
      )}
      {done && (
        <p className="text-sm text-stone-500">
          <Link href="/zh/kiem-tra" className="underline">← Các đề khác</Link>
        </p>
      )}
    </div>
  );
}

function PartView({
  part,
  answers,
  onAnswer,
  marks,
}: {
  part: ZhTestPart;
  answers: Record<string, ZhAnswer>;
  onAnswer: (partId: string, i: number, v: ZhAnswer) => void;
  marks?: boolean[];
}) {
  const [played, setPlayed] = useState<string | null>(null);
  let lastPassage = "";
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-stone-900">{part.title_vi}</h3>
        <p className="text-sm text-stone-500">{part.instructions_vi}</p>
      </div>
      {part.bank && (
        <ol className="grid gap-1 rounded-xl bg-stone-100 p-3 text-base sm:grid-cols-2">
          {part.bank.map((b, i) => (
            <li key={i} lang="zh-CN" className={han}>
              <strong className="mr-1 font-sans text-stone-600">{LETTERS[i]}</strong>
              {b}
            </li>
          ))}
        </ol>
      )}
      <ol className="space-y-4">
        {part.items.map((item, i) => {
          const value = answers[answerKey(part.id, i)];
          const mark = marks?.[i];
          const showPassage = item.passage && item.passage !== lastPassage;
          if (item.passage) lastPassage = item.passage;
          return (
            <li key={i} className={`rounded-xl border p-3 ${mark === undefined ? "border-stone-200 bg-white" : mark ? "border-jade-600/40 bg-jade-50/50" : "border-red-300 bg-red-50/50"}`}>
              {showPassage && <p lang="zh-CN" className={`${han} mb-3 rounded-lg bg-stone-50 p-3 text-lg leading-relaxed`}>{item.passage}</p>}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-stone-500">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-2">
                  {item.audio && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlayed(`${part.id}:${i}`);
                          speakChinese(spokenText(item), 0.9);
                        }}
                        className="min-h-11 rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 active:bg-brand-100"
                      >
                        🔊 {played === `${part.id}:${i}` ? "Nghe lại" : "Nghe"}
                      </button>
                    </div>
                  )}
                  {item.q && part.kind !== "bank" && part.kind !== "type" && <p lang="zh-CN" className={`${han} text-lg`}>{item.q}</p>}
                  {part.kind === "bank" && <p lang="zh-CN" className={`${han} text-lg`}>{item.q}</p>}
                  {part.kind === "type" && (
                    <p lang="zh-CN" className={`${han} text-lg`}>
                      {item.q} <span className="font-sans text-sm text-stone-500">({item.hint})</span>
                    </p>
                  )}
                  <Input part={part} item={item} value={value} locked={mark !== undefined} onChange={(v) => onAnswer(part.id, i, v)} />
                  {mark === false && <Answer part={part} item={item} />}
                  {mark !== undefined && item.audio && (
                    <p lang="zh-CN" className={`${han} whitespace-pre-line rounded-lg bg-stone-50 p-2 text-sm text-stone-600`}>
                      {item.audio}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Input({ part, item, value, locked, onChange }: { part: ZhTestPart; item: ZhTestItem; value: ZhAnswer; locked: boolean; onChange: (v: ZhAnswer) => void }) {
  if (part.kind === "listen" || part.kind === "mcq") {
    return (
      <div className="grid gap-2">
        {item.options!.map((o, k) => (
          <label key={k} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${value === k ? "border-brand-600 bg-brand-50" : "border-stone-200"} ${locked ? "pointer-events-none" : ""}`}>
            <input type="radio" className="size-5 accent-brand-600" checked={value === k} onChange={() => onChange(k)} />
            <span lang="zh-CN" className={`${han} text-base`}>
              <strong className="mr-1 font-sans text-stone-500">{LETTERS[k]}</strong>
              {o}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (part.kind === "bank") {
    return (
      <div className="flex flex-wrap gap-2">
        {part.bank!.map((_, k) => (
          <button
            key={k}
            type="button"
            disabled={locked}
            onClick={() => onChange(k)}
            className={`size-11 rounded-lg border text-base font-semibold ${value === k ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700"}`}
          >
            {LETTERS[k]}
          </button>
        ))}
      </div>
    );
  }
  if (part.kind === "type") {
    return (
      <input
        lang="zh-CN"
        value={typeof value === "string" ? value : ""}
        disabled={locked}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`${han} w-full max-w-xs rounded-lg border border-stone-300 px-3 py-2 text-xl`}
        placeholder="汉字"
      />
    );
  }
  // reorder: tap the pieces in order; tap the built sentence area to undo the last piece
  const picked = typeof value === "string" ? value.split("|").filter(Boolean) : [];
  const built = picked.map((idx) => item.words![Number(idx)]!);
  return (
    <div className="space-y-2">
      <div lang="zh-CN" className={`${han} min-h-12 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-lg`}>
        {built.join("") || <span className="font-sans text-sm text-stone-400">Chạm các từ bên dưới theo thứ tự</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.words!.map((w, k) => {
          const used = picked.includes(String(k));
          return (
            <button
              key={k}
              type="button"
              disabled={used || locked}
              onClick={() => onChange([...picked, String(k)].join("|"))}
              lang="zh-CN"
              className={`${han} min-h-11 rounded-lg border px-3 text-lg ${used ? "border-stone-200 bg-stone-100 text-stone-300" : "border-stone-300 bg-white"}`}
            >
              {w}
            </button>
          );
        })}
        {picked.length > 0 && !locked && (
          <button type="button" onClick={() => onChange(picked.slice(0, -1).join("|"))} className="min-h-11 rounded-lg px-3 text-sm text-stone-600 ring-1 ring-stone-300">
            ⌫ Xoá
          </button>
        )}
      </div>
    </div>
  );
}

function Answer({ part, item }: { part: ZhTestPart; item: ZhTestItem }) {
  const text =
    part.kind === "bank"
      ? `${LETTERS[Number(item.answer)]}. ${part.bank![Number(item.answer)]}`
      : part.kind === "listen" || part.kind === "mcq"
        ? `${LETTERS[Number(item.answer)]}. ${item.options![Number(item.answer)]}`
        : String(item.answer);
  return (
    <p className="text-sm font-medium text-red-700">
      Đáp án đúng: <span lang="zh-CN" className={han}>{text}</span>
    </p>
  );
}
