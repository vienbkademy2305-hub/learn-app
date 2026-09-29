"use client";
/**
 * A stage test (mini test / exit test): countdown, one submission for all exercises, then the score,
 * pass or not against the test's pass mark, and the lessons to review. Attempts are kept in the
 * English progress store (synced with the account like the rest of the progress).
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EnTest } from "@/content/en-types";
import { countWords } from "@/domain/en-grade";
import { summarizeTest, testExercises, testItemCount, weakLessons, type TestSummary } from "@/domain/en-test";
import { ExerciseCard } from "./ExerciseSet";
import { bestAttempt, saveTestAttempt, useEnProgress } from "./progress";

type LessonLink = { number: number; slug: string; title: string };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function TestRunner({ test, lessons }: { test: EnTest; lessons: LessonLink[] }) {
  const [progress, update, hydrated] = useEnProgress();
  const [phase, setPhase] = useState<"intro" | "doing" | "done">("intro");
  const [run, setRun] = useState(0);
  const [left, setLeft] = useState(test.minutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Record<string, boolean[]>>({});
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [writing, setWriting] = useState("");
  const startedAt = useRef(0);
  const saved = useRef(false);
  const top = useRef<HTMLDivElement>(null);

  const exercises = useMemo(() => testExercises(test), [test]);
  const items = useMemo(() => testItemCount(test), [test]);
  const attempts = hydrated ? (progress.tests[test.id] ?? []) : [];
  const best = hydrated ? bestAttempt(progress, test.id) : undefined;
  const lessonOf = (n: number) => lessons.find((l) => l.number === n);

  const start = () => {
    setRun((r) => r + 1);
    setLeft(test.minutes * 60);
    setSubmitted(false);
    setResults({});
    setSummary(null);
    setWriting("");
    saved.current = false;
    startedAt.current = Date.now();
    setPhase("doing");
    window.scrollTo({ top: 0 });
  };

  const submit = useCallback(() => setSubmitted(true), []);
  const onResult = useCallback((id: string, ok: boolean[]) => setResults((r) => ({ ...r, [id]: ok })), []);

  // countdown; time up = submit
  useEffect(() => {
    if (phase !== "doing" || submitted) return;
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase, submitted]);
  useEffect(() => {
    if (phase === "doing" && !submitted && left === 0) submit();
  }, [left, phase, submitted, submit]);

  // every card reports once after submit → score and save the attempt
  useEffect(() => {
    if (!submitted || saved.current || Object.keys(results).length < exercises.length) return;
    saved.current = true;
    const s = summarizeTest(test, results);
    setSummary(s);
    setPhase("done");
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    update(saveTestAttempt(test.id, { at: new Date().toISOString(), correct: s.correct, total: s.total, percent: s.percent, passed: s.passed, seconds, byLesson: s.byLesson }));
    top.current?.scrollIntoView({ behavior: "smooth" });
  }, [submitted, results, exercises.length, test, update]);

  const weak = summary ? weakLessons(summary.byLesson, test.pass_percent) : [];
  const words = countWords(writing);
  let index = 0;

  return (
    <div className="space-y-6" ref={top}>
      {phase === "intro" && (
        <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {test.intro_vi && <p className="text-stone-700">{test.intro_vi}</p>}
          <ul className="grid gap-2 text-sm sm:grid-cols-3">
            <li className="rounded-xl bg-stone-50 p-3"><span className="block text-2xl font-bold text-stone-900">{test.minutes}</span>phút</li>
            <li className="rounded-xl bg-stone-50 p-3"><span className="block text-2xl font-bold text-stone-900">{items}</span>câu chấm tự động</li>
            <li className="rounded-xl bg-stone-50 p-3"><span className="block text-2xl font-bold text-stone-900">{test.pass_percent}%</span>để đạt</li>
          </ul>
          {best && (
            <p className="text-sm text-stone-600">
              Kết quả tốt nhất: <strong>{best.percent}%</strong> ({best.correct}/{best.total}) {best.passed ? "· ✓ Đạt" : "· chưa đạt"} — đã làm {attempts.length} lần.
            </p>
          )}
          <p className="text-sm text-stone-500">Làm liền một lượt, không xem lại bài học. Hết giờ bài sẽ tự nộp.</p>
          <button type="button" onClick={start} className="rounded-xl bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800">
            {attempts.length ? "Làm lại bài kiểm tra" : "Bắt đầu làm bài"}
          </button>
        </section>
      )}

      {phase === "doing" && !submitted && (
        <div className="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-2 backdrop-blur">
          <span className={`font-mono text-lg font-bold ${left <= 60 ? "text-red-700" : "text-stone-900"}`} aria-live="polite">
            ⏱ {mmss(left)}
          </span>
          <button
            type="button"
            onClick={() => window.confirm("Nộp bài bây giờ? Câu nào chưa làm sẽ tính là sai.") && submit()}
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Nộp bài
          </button>
        </div>
      )}

      {summary && (
        <section className={`space-y-4 rounded-2xl p-6 shadow-sm ring-1 ${summary.passed ? "bg-jade-50 ring-jade-100" : "bg-amber-50 ring-amber-200"}`}>
          <div className="flex flex-wrap items-end gap-4">
            <p className={`text-5xl font-bold ${summary.passed ? "text-jade-700" : "text-amber-800"}`}>{summary.percent}%</p>
            <div>
              <p className="text-lg font-semibold text-stone-900">{summary.passed ? "Đạt — sẵn sàng đi tiếp!" : `Chưa đạt (cần ${test.pass_percent}%)`}</p>
              <p className="text-sm text-stone-600">{summary.correct}/{summary.total} câu đúng</p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {summary.bySection.map((s) => (
              <li key={s.title_vi} className="flex justify-between rounded-xl bg-white/70 px-3 py-2">
                <span>{s.title_vi}</span>
                <span className="font-semibold">{s.correct}/{s.total}</span>
              </li>
            ))}
          </ul>
          {weak.length > 0 ? (
            <div>
              <p className="font-semibold text-stone-900">Nên ôn lại:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {weak.map((w) => {
                  const l = lessonOf(w.lesson);
                  return (
                    <li key={w.lesson}>
                      <Link href={l ? `/en/lesson/${l.slug}` : "/en"} className="inline-block rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-stone-200 hover:ring-sky-300">
                        Buổi {w.lesson}{l ? ` · ${l.title}` : ""} <span className="text-stone-500">({w.correct}/{w.total})</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-stone-700">Không có buổi nào dưới {test.pass_percent}% — rất tốt!</p>
          )}
          <p className="text-sm text-stone-600">Xem đáp án từng câu bên dưới.</p>
          <button type="button" onClick={start} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-white">
            Làm lại
          </button>
        </section>
      )}

      {phase !== "intro" && (
        <div key={run} className="space-y-8">
          {test.sections.map((sec) => (
            <section key={sec.title_vi} className="space-y-4">
              <h2 className="text-xl font-bold text-stone-900">{sec.title_vi}</h2>
              {sec.exercises.map((ex) => {
                index += 1;
                return <ExerciseCard key={ex.id} ex={ex} index={index} test={{ submitted, onResult }} />;
              })}
            </section>
          ))}
          {test.writing && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-stone-900">Viết</h2>
              <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-stone-800">{test.writing.prompt_vi}</p>
                {test.writing.prompt_en && <p lang="en" className="text-stone-500 italic">{test.writing.prompt_en}</p>}
                <textarea
                  lang="en"
                  value={writing}
                  onChange={(e) => setWriting(e.target.value)}
                  disabled={submitted}
                  rows={8}
                  spellCheck={false}
                  className="w-full rounded-xl border border-stone-300 p-3 text-base leading-relaxed focus:border-sky-500 focus:outline-none"
                />
                <p className="text-sm text-stone-500">
                  {words} từ (yêu cầu {test.writing.words.min}–{test.writing.words.max}). Phần viết không tính vào điểm — tự rà lỗi (a/an/the, -s, thì, viết hoa I)
                  hoặc nhờ gia sư chấm.
                </p>
              </div>
            </section>
          )}
          {!submitted && (
            <button
              type="button"
              onClick={() => window.confirm("Nộp bài bây giờ?") && submit()}
              className="w-full rounded-xl bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800 sm:w-auto"
            >
              Nộp bài
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Test cards for /en and /en/kiem-tra with the best result so far. */
export function TestList({ tests }: { tests: Array<{ id: string; title: string; kind: string; after: number; minutes: number; pass: number; items: number }> }) {
  const [progress, , hydrated] = useEnProgress();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tests.map((t) => {
        const best = hydrated ? bestAttempt(progress, t.id) : undefined;
        return (
          <li key={t.id}>
            <Link
              href={`/en/kiem-tra/${t.id}`}
              className={`flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm hover:border-sky-300 ${t.kind === "final" ? "border-sky-300 ring-1 ring-sky-200" : "border-stone-200"}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-sky-800">{t.kind === "final" ? "Đầu ra giai đoạn" : `Sau Buổi ${t.after}`}</span>
              <span className="mt-1 font-semibold text-stone-900">{t.title}</span>
              <span className="text-sm text-stone-500">{t.minutes} phút · {t.items} câu · đạt từ {t.pass}%</span>
              <span className={`mt-2 text-sm font-medium ${best ? (best.passed ? "text-jade-700" : "text-amber-700") : "text-stone-400"}`}>
                {best ? `Tốt nhất ${best.percent}% ${best.passed ? "✓ Đạt" : "· chưa đạt"}` : "Chưa làm"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
