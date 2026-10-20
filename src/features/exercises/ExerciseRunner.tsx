"use client";
/**
 * Runs one exercise set: intro → questions one by one → score screen.
 * Questions are generated on "Bắt đầu" (client-side randomness keeps the site
 * static). Each question view reports its result once through `onResult`.
 */
import { useRef, useState, type ReactNode } from "react";
import { recordExercise, type ExerciseType } from "@/domain/progress";
import { XP } from "@/domain/activity";
import { QuizResult } from "@/features/quiz/QuizResult";
import { QuizButton, QuizShell } from "@/features/quiz/QuizShell";
import { useProgress } from "@/features/progress/store";

export function ExerciseRunner<Q>({
  lessonSlug,
  type,
  build,
  renderQuestion,
  emptyMessage = "Bài học này chưa đủ dữ liệu để tạo bài tập.",
  title = "Bài tập",
}: {
  lessonSlug: string;
  /** scores are saved only when a type is given (practice rounds are not scored) */
  type?: ExerciseType;
  /** kept for callers; the score screen now offers "Thử lại" / "Bỏ qua" instead of a link */
  back?: { href: string; label: string };
  title?: string;
  build: () => Q[];
  renderQuestion: (q: Q, onResult: (correct: boolean) => void) => ReactNode;
  emptyMessage?: string;
}) {
  const [, update] = useProgress();
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [round, setRound] = useState(0);
  const startedAt = useRef(0);
  const [showResult, setShowResult] = useState(false);

  const start = () => {
    setQuestions(build());
    setIndex(0);
    setResults([]);
    setShowResult(false);
    setRound((r) => r + 1);
    startedAt.current = Date.now();
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
  const finished = results.length === questions.length && showResult;

  const onResult = (correct: boolean) => {
    if (results.length > index) return;
    const next = [...results, correct];
    setResults(next);
    if (next.length === questions.length && type) {
      update((s) => recordExercise(s, lessonSlug, type, next.filter(Boolean).length, questions.length));
    }
  };

  const exit = () => setQuestions(null);
  if (finished) {
    return <QuizResult correct={correctCount} total={questions.length} seconds={(Date.now() - startedAt.current) / 1000} xp={XP.exercise} onRetry={start} onSkip={exit} />;
  }

  const last = results[results.length - 1];
  return (
    <QuizShell
      progress={results.length / questions.length}
      badge={correctCount}
      title={title}
      top={
        <p className="text-center text-lg font-bold">
          <span className="text-emerald-400">✓ {correctCount}</span>
          <span className="ml-5 text-red-400">✗ {results.length - correctCount}</span>
          <span className="ml-5 text-neutral-500">{Math.min(index + 1, questions.length)}/{questions.length}</span>
        </p>
      }
      footer={
        answered ? (
          <QuizButton state={last ? "ok" : "bad"} onClick={() => (index + 1 >= questions.length ? setShowResult(true) : setIndex((i) => i + 1))}>
            {index + 1 >= questions.length ? "Xem kết quả" : "Tiếp theo"}
          </QuizButton>
        ) : (
          <QuizButton state="disabled">Tiếp theo</QuizButton>
        )
      }
      onExit={exit}
    >
      <div key={`${round}-${index}`}>{renderQuestion(questions[index]!, onResult)}</div>
    </QuizShell>
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
