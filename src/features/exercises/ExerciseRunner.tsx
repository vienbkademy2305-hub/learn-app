"use client";
/**
 * Runs one exercise set: intro → questions one by one → score screen.
 * Questions are generated on "Bắt đầu" (client-side randomness keeps the site
 * static). Each question view reports its result once through `onResult`.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { recordExercise, type ExerciseType } from "@/domain/progress";
import { ProgressBar } from "@/features/progress/ProgressWidgets";
import { useProgress } from "@/features/progress/store";

export function ExerciseRunner<Q>({
  lessonSlug,
  type,
  build,
  renderQuestion,
  emptyMessage = "Bài học này chưa đủ dữ liệu để tạo bài tập.",
  back = { href: `/zh/lesson/${lessonSlug}/exercises`, label: "Bài tập khác" },
}: {
  lessonSlug: string;
  /** scores are saved only when a type is given (practice rounds are not scored) */
  type?: ExerciseType;
  back?: { href: string; label: string };
  build: () => Q[];
  renderQuestion: (q: Q, onResult: (correct: boolean) => void) => ReactNode;
  emptyMessage?: string;
}) {
  const [, update] = useProgress();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [round, setRound] = useState(0);

  const start = () => {
    setQuestions(build());
    setIndex(0);
    setResults([]);
    setRound((r) => r + 1);
  };

  if (!questions) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <button type="button" onClick={start} className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
          Bắt đầu
        </button>
        <p className="mt-3 text-sm text-stone-500">Mỗi lần làm, câu hỏi được chọn ngẫu nhiên từ nội dung bài.</p>
      </div>
    );
  }

  if (questions.length === 0) return <p className="rounded-2xl bg-white p-6 text-center text-stone-500">{emptyMessage}</p>;

  const answered = results.length > index;
  const correctCount = results.filter(Boolean).length;
  const finished = results.length === questions.length;

  const onResult = (correct: boolean) => {
    if (results.length > index) return;
    const next = [...results, correct];
    setResults(next);
    if (next.length === questions.length && type) {
      update((s) => recordExercise(s, lessonSlug, type, next.filter(Boolean).length, questions.length));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-stone-500">
          <span>
            Câu {Math.min(index + 1, questions.length)}/{questions.length}
          </span>
          <span>
            Đúng <strong className="text-jade-700">{correctCount}</strong>
          </span>
        </div>
        <ProgressBar percent={Math.round((results.length / questions.length) * 100)} label="Tiến độ bài tập" />
      </div>

      <div key={`${round}-${index}`} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        {renderQuestion(questions[index]!, onResult)}
      </div>

      {answered && !finished && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setIndex((i) => i + 1)} className="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
            Câu tiếp →
          </button>
        </div>
      )}

      {finished && <ScoreCard score={correctCount} total={questions.length} onRetry={start} back={back} />}
    </div>
  );
}

function ScoreCard({ score, total, onRetry, back }: { score: number; total: number; onRetry: () => void; back: { href: string; label: string } }) {
  const ratio = score / total;
  const message = ratio === 1 ? "Xuất sắc! Đúng hết." : ratio >= 0.8 ? "Rất tốt!" : ratio >= 0.5 ? "Khá lắm, ôn thêm một chút nhé." : "Cần ôn lại bài rồi làm lại nhé.";
  return (
    <div className="rounded-2xl border border-jade-100 bg-jade-50 p-5 text-center" role="status">
      <p className="text-sm text-jade-700">Kết quả</p>
      <p className="text-4xl font-bold text-stone-900">
        {score}
        <span className="text-xl text-stone-400">/{total}</span>
      </p>
      <p className="mt-1 font-medium text-stone-700">{message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onRetry} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Làm lại (câu hỏi mới)
        </button>
        <Link href={back.href} className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
          {back.label}
        </Link>
      </div>
    </div>
  );
}

/** Four-option multiple choice with correct/incorrect colouring after the pick. */
export function Choices({
  choices,
  onResult,
  hanzi = false,
}: {
  choices: Array<{ text: string; sub?: string; correct: boolean }>;
  onResult: (correct: boolean) => void;
  hanzi?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {choices.map((c, i) => {
        const state = picked === null ? "idle" : c.correct ? "right" : picked === i ? "wrong" : "muted";
        return (
          <li key={i}>
            <button
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                onResult(c.correct);
              }}
              className={`w-full rounded-xl px-4 py-3 text-left ring-1 ring-inset transition-colors ${
                state === "right"
                  ? "bg-jade-50 text-jade-700 ring-jade-600"
                  : state === "wrong"
                    ? "bg-brand-50 text-brand-700 ring-brand-500"
                    : state === "muted"
                      ? "bg-white text-stone-400 ring-stone-200"
                      : "bg-white text-stone-800 ring-stone-300 hover:bg-stone-50 hover:ring-brand-300"
              }`}
            >
              <span lang={hanzi ? "zh-CN" : undefined} className={hanzi ? "font-han text-2xl" : ""}>
                {c.text}
              </span>
              {c.sub && <span className="ml-2 text-sm text-stone-500">{c.sub}</span>}
              {state === "right" && <span className="float-right">✓</span>}
              {state === "wrong" && <span className="float-right">✗</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Feedback({ correct, children }: { correct: boolean; children?: ReactNode }) {
  return (
    <div className={`rounded-xl p-3 text-sm ${correct ? "bg-jade-50 text-jade-700" : "bg-brand-50 text-brand-800"}`} role="status">
      <p className="font-semibold">{correct ? "Chính xác!" : "Chưa đúng."}</p>
      {children && <div className="mt-1 text-stone-700">{children}</div>}
    </div>
  );
}
