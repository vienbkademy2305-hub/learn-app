"use client";
/**
 * English exercises (ENGLISH_SPLIT_PLAN E3): one card per exercise, graded in the browser by
 * src/domain/en-grade.ts; the best score of each exercise is kept in the English progress store.
 */
import { useState } from "react";
import type { Exercise } from "@/content/en-types";
import { gradeCorrection, gradeDictation, isCorrect, mcqIndex } from "@/domain/en-grade";
import { saveScore, useEnProgress } from "./progress";
import { Say } from "./speech";

const KIND_VI: Record<string, string> = {
  "gap-fill": "Điền từ", "verb-form": "Chia động từ", "word-form": "Dạng từ", paraphrase: "Viết lại câu", transformation: "Biến đổi câu",
  combine: "Nối câu", mcq: "Trắc nghiệm", tfng: "True / False / Not Given", ynng: "Yes / No / Not Given", completion: "Điền thông tin",
  "match-definition": "Nối từ – định nghĩa", collocation: "Ghép cụm từ", "error-correction": "Tìm và sửa lỗi", dictation: "Nghe chép",
  "speaking-part1": "Nói – Part 1", "speaking-part2": "Nói – Part 2", "speaking-part3": "Nói – Part 3",
};

export function ExerciseSet({ exercises }: { exercises: Exercise[] }) {
  const [progress, , hydrated] = useEnProgress();
  const done = hydrated ? exercises.filter((e) => progress.exercises[e.id]) : [];
  const correct = done.reduce((n, e) => n + progress.exercises[e.id]!.correct, 0);
  const total = done.reduce((n, e) => n + progress.exercises[e.id]!.total, 0);
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500">
        {exercises.length} bài. {done.length > 0 && `Đã làm ${done.length}/${exercises.length} · điểm tốt nhất ${correct}/${total}.`} Máy chấm không
        phân biệt hoa thường và dạng viết tắt (don&apos;t = do not), nhưng chấm chặt chính tả.
      </p>
      {exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} ex={ex} index={i + 1} best={hydrated ? progress.exercises[ex.id] : undefined} />
      ))}
    </div>
  );
}

type Result = { ok: boolean[]; correct: number; total: number };

function ExerciseCard({ ex, index, best }: { ex: Exercise; index: number; best?: { correct: number; total: number } }) {
  const [, update] = useEnProgress();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [text, setText] = useState(ex.kind === "error-correction" ? (ex.text ?? "") : "");
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const qs = ex.questions ?? [];
  const set = (i: number, v: string) => setAnswers((a) => ({ ...a, [i]: v }));
  const speaking = ex.kind.startsWith("speaking");

  const check = () => {
    let ok: boolean[];
    let total: number;
    let correct: number;
    if (ex.kind === "error-correction") {
      ok = gradeCorrection(text, ex.errors ?? []);
    } else if (ex.kind === "dictation") {
      const d = gradeDictation(text, ex.text ?? "");
      ok = d.words.map((w) => w.ok);
    } else if (ex.kind === "match-definition" || ex.kind === "collocation") {
      ok = (ex.pairs ?? []).map((p, i) => answers[i] === p.right);
    } else if (ex.kind === "mcq") {
      ok = qs.map((q, i) => answers[i] !== undefined && Number(answers[i]) === mcqIndex(q.answer));
    } else if (ex.kind === "tfng" || ex.kind === "ynng") {
      ok = qs.map((q, i) => answers[i] === String(q.answer));
    } else {
      ok = qs.map((q, i) => isCorrect(answers[i] ?? "", q.answer, q.accept));
    }
    total = ok.length;
    correct = ok.filter(Boolean).length;
    setResult({ ok, correct, total });
    update(saveScore(ex.id, correct, total));
  };

  const reset = () => {
    setAnswers({});
    setText(ex.kind === "error-correction" ? (ex.text ?? "") : "");
    setResult(null);
    setAttempt((n) => n + 1);
  };

  const mark = (i: number) => (result ? (result.ok[i] ? "ring-jade-600 bg-jade-50" : "ring-red-400 bg-red-50") : "ring-stone-300 bg-white");

  return (
    <section key={attempt} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            Bài {index} · {KIND_VI[ex.kind] ?? ex.kind}
          </p>
          <h2 className="mt-1 font-semibold text-stone-900">{ex.instructions_vi}</h2>
        </div>
        {best && (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
            Tốt nhất: {best.correct}/{best.total}
          </span>
        )}
      </header>

      {ex.bank && (
        <div className="flex flex-wrap gap-2" lang="en">
          {ex.bank.map((w) => (
            <span key={w} className="rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-medium text-sky-900 ring-1 ring-sky-200">{w}</span>
          ))}
        </div>
      )}
      {ex.passage && <p lang="en" className="rounded-xl bg-stone-50 p-4 leading-relaxed whitespace-pre-line text-stone-800">{ex.passage}</p>}
      {ex.max_words && <p className="text-xs text-stone-500">Tối đa {ex.max_words} từ mỗi chỗ trống.</p>}

      {/* Question bodies by kind */}
      {(ex.kind === "match-definition" || ex.kind === "collocation") && (
        <ol className="space-y-2">
          {(ex.pairs ?? []).map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3">
              <span lang="en" className="min-w-28 font-semibold text-stone-900">{p.left}</span>
              <select
                lang="en"
                value={answers[i] ?? ""}
                disabled={!!result}
                onChange={(e) => set(i, e.target.value)}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-sm ring-1 ring-inset ${mark(i)}`}
              >
                <option value="">— chọn —</option>
                {stableShuffle((ex.pairs ?? []).map((x) => x.right), ex.id).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {result && !result.ok[i] && <span lang="en" className="w-full text-sm text-jade-700">✓ {p.right}</span>}
            </li>
          ))}
        </ol>
      )}

      {ex.kind === "mcq" && (
        <ol className="space-y-4">
          {qs.map((q, i) => (
            <li key={i}>
              <p lang="en" className="font-medium text-stone-900">{i + 1}. {q.q}</p>
              <div className="mt-2 flex flex-wrap gap-2" lang="en">
                {(q.options ?? []).map((o, k) => {
                  const chosen = answers[i] === String(k);
                  const right = result && k === mcqIndex(q.answer);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!!result}
                      onClick={() => set(i, String(k))}
                      className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ${
                        right ? "bg-jade-600 text-white ring-jade-600" : chosen ? (result ? "bg-red-100 text-red-800 ring-red-300" : "bg-sky-700 text-white ring-sky-700") : "bg-white text-stone-800 ring-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {String.fromCharCode(65 + k)}. {o}
                    </button>
                  );
                })}
              </div>
              {result && q.explain_vi && <p className="mt-1 text-sm text-stone-500">{q.explain_vi}</p>}
            </li>
          ))}
        </ol>
      )}

      {(ex.kind === "tfng" || ex.kind === "ynng") && (
        <ol className="space-y-3">
          {qs.map((q, i) => (
            <li key={i}>
              <p lang="en" className="text-stone-900">{i + 1}. {q.q}</p>
              <div className="mt-1.5 flex gap-2">
                {(ex.kind === "tfng" ? ["T", "F", "NG"] : ["Y", "N", "NG"]).map((o) => {
                  const chosen = answers[i] === o;
                  const right = result && o === String(q.answer);
                  return (
                    <button
                      key={o}
                      type="button"
                      disabled={!!result}
                      onClick={() => set(i, o)}
                      className={`min-w-12 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${
                        right ? "bg-jade-600 text-white ring-jade-600" : chosen ? (result ? "bg-red-100 text-red-800 ring-red-300" : "bg-sky-700 text-white ring-sky-700") : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {result && q.explain_vi && <p className="mt-1 text-sm text-stone-500">{q.explain_vi}</p>}
            </li>
          ))}
        </ol>
      )}

      {["gap-fill", "verb-form", "word-form", "completion", "paraphrase", "transformation", "combine"].includes(ex.kind) && (
        <ol className="space-y-3">
          {qs.map((q, i) => {
            const inline = (q.q ?? "").includes("___");
            const input = (
              <input
                lang="en"
                value={answers[i] ?? ""}
                disabled={!!result}
                onChange={(e) => set(i, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !result && check()}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`rounded-lg px-2 py-1 text-base ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-sky-500 ${mark(i)} ${inline ? "mx-1 w-40 max-w-full" : "mt-2 w-full"}`}
              />
            );
            const [before, after] = (q.q ?? "").split("___");
            return (
              <li key={i}>
                <div lang="en" className="leading-loose text-stone-900">
                  {i + 1}.{" "}
                  {inline ? (
                    <>
                      {before}
                      {input}
                      {after}
                    </>
                  ) : (
                    <>
                      {q.q}
                      {input}
                    </>
                  )}
                  {q.base && <span className="ml-1 text-sm text-stone-400">({q.base})</span>}
                </div>
                {result && !result.ok[i] && <p lang="en" className="text-sm font-medium text-jade-700">✓ {String(q.answer)}</p>}
                {result && q.explain_vi && <p className="text-sm text-stone-500">{q.explain_vi}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {ex.kind === "error-correction" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Sửa trực tiếp trong ô dưới đây rồi bấm Kiểm tra.</p>
          <textarea
            lang="en"
            value={text}
            disabled={!!result}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            spellCheck={false}
            className="w-full rounded-xl border border-stone-300 p-3 text-base leading-relaxed focus:border-sky-500 focus:outline-none"
          />
          {result && (
            <ol className="space-y-2">
              {(ex.errors ?? []).map((e, i) => (
                <li key={i} className={`rounded-xl p-3 text-sm ${result.ok[i] ? "bg-jade-50" : "bg-red-50"}`}>
                  <span lang="en" className="text-red-700 line-through">{e.wrong}</span> → <span lang="en" className="font-semibold text-jade-700">{e.right}</span>
                  {e.why && <span className="ml-2 text-stone-600">({e.why})</span>}
                  <span className="ml-2">{result.ok[i] ? "✓ đã sửa" : "✗ chưa sửa"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {ex.kind === "dictation" && ex.text && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            Nghe đoạn văn (có thể nghe nhiều lần): <Say text={ex.text} slow label="Nghe" />
          </div>
          <textarea
            lang="en"
            value={text}
            disabled={!!result}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="Type what you hear…"
            className="w-full rounded-xl border border-stone-300 p-3 text-base leading-relaxed focus:border-sky-500 focus:outline-none"
          />
          {result && (
            <p lang="en" className="rounded-xl bg-stone-50 p-3 leading-relaxed">
              {gradeDictation(text, ex.text).words.map((w, i) => (
                <span key={i} className={w.ok ? "text-jade-700" : "rounded bg-red-100 px-0.5 text-red-700"}>
                  {w.word}{" "}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {speaking && (
        <div className="space-y-2">
          {ex.cue_card && (
            <div className="rounded-xl bg-stone-50 p-4" lang="en">
              <p className="font-semibold">{ex.cue_card.topic}</p>
              <ul className="mt-1 list-disc pl-5 text-stone-700">{ex.cue_card.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          <ol className="list-decimal space-y-1 pl-5" lang="en">
            {qs.map((q, i) => <li key={i}>{q.q}</li>)}
          </ol>
          <p className="text-sm text-stone-500">Tự trả lời thành tiếng, mỗi câu 2–3 câu. Phần này không chấm tự động.</p>
        </div>
      )}

      {!speaking && (
        <footer className="flex flex-wrap items-center gap-3">
          {!result ? (
            <button type="button" onClick={check} className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
              Kiểm tra
            </button>
          ) : (
            <>
              <span className={`text-lg font-bold ${result.correct === result.total ? "text-jade-700" : "text-stone-900"}`}>
                {result.correct}/{result.total} {result.correct === result.total ? "— Tuyệt vời!" : ""}
              </span>
              <button type="button" onClick={reset} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
                Làm lại
              </button>
            </>
          )}
        </footer>
      )}
    </section>
  );
}

/** Same order on server and client (no hydration mismatch), different per exercise. */
function stableShuffle(items: string[], seed: string): string[] {
  const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return [...items].sort((a, b) => h(seed + a) - h(seed + b));
}
