"use client";
/**
 * One-question-at-a-time mode of an English exercise (docs/UI_POLISH_PLAN.md). Covers the kinds whose questions are
 * graded independently: multiple choice, True/False/Not Given, Yes/No/NG, and the typed gap-fill family.
 * The score is saved like the list mode's (best result per exercise).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/content/en-types";
import { isCorrect, mcqIndex } from "@/domain/en-grade";
import { XP } from "@/domain/activity";
import { FeedbackPanel, QuizButton, QuizShell, QuizTile, type TileState } from "@/features/quiz/QuizShell";
import { QuizResult } from "@/features/quiz/QuizResult";
import { saveScore, useEnProgress } from "./progress";
import { Say } from "./speech";

const CHOICE_KINDS = ["mcq", "tfng", "ynng", "tf"];
const TYPED_KINDS = ["gap-fill", "verb-form", "word-form", "completion", "paraphrase", "transformation", "combine"];

export const quizSupported = (ex: Exercise) => (CHOICE_KINDS.includes(ex.kind) || TYPED_KINDS.includes(ex.kind)) && (ex.questions?.length ?? 0) > 0;

const TITLE: Record<string, string> = {
  mcq: "Chọn đáp án đúng",
  tfng: "True / False / Not Given",
  tf: "Đúng hay sai?",
  ynng: "Yes / No / Not Given",
  "gap-fill": "Điền từ vào chỗ trống",
  "verb-form": "Chia động từ",
  "word-form": "Điền dạng đúng của từ",
  completion: "Điền thông tin",
  paraphrase: "Viết lại câu",
  transformation: "Biến đổi câu",
  combine: "Nối câu",
};

const LABELS: Record<string, string[]> = {
  tfng: ["T", "F", "NG"],
  tf: ["T", "F"],
  ynng: ["Y", "N", "NG"],
};
const LABEL_TEXT: Record<string, string> = { T: "True", F: "False", NG: "Not Given", Y: "Yes", N: "No" };

export function ExerciseQuiz({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const [, update] = useEnProgress();
  const qs = ex.questions ?? [];
  const choice = CHOICE_KINDS.includes(ex.kind);
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [ok, setOk] = useState<boolean[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [start, setStart] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  const q = qs[i];
  const finished = i >= qs.length;
  const correctCount = ok.filter(Boolean).length;
  const rightAnswer = q ? (ex.kind === "mcq" ? String(mcqIndex(q.answer)) : String(q.answer ?? "")) : "";

  useEffect(() => {
    if (checked !== null) nextRef.current?.focus();
  }, [checked]);

  // save the score once, when the run is finished
  const saved = useRef(-1);
  useEffect(() => {
    if (!finished || saved.current === round) return;
    saved.current = round;
    setSeconds((Date.now() - start) / 1000);
    update(saveScore(ex.id, ok.filter(Boolean).length, qs.length));
  }, [finished, round, start, ex.id, ok, qs.length, update]);

  const grade = (value: string) => {
    if (!q || checked !== null) return;
    const right = choice ? (ex.kind === "mcq" ? Number(value) === mcqIndex(q.answer) : value === String(q.answer)) : isCorrect(value, q.answer, q.accept);
    setChecked(right);
    setOk((a) => [...a, right]);
  };
  const next = () => {
    setI((n) => n + 1);
    setPicked(null);
    setTyped("");
    setChecked(null);
  };
  const retry = () => {
    setRound((r) => r + 1);
    setI(0);
    setOk([]);
    setPicked(null);
    setTyped("");
    setChecked(null);
    setStart(Date.now());
  };

  const options = useMemo<Array<{ value: string; label: string }>>(() => {
    if (!q || !choice) return [];
    if (ex.kind === "mcq") return (q.options ?? []).map((o, k) => ({ value: String(k), label: o }));
    return (LABELS[ex.kind] ?? []).map((v) => ({ value: v, label: LABEL_TEXT[v] ?? v }));
  }, [q, choice, ex.kind]);

  if (finished) {
    return <QuizResult correct={correctCount} total={qs.length} seconds={seconds} xp={XP.exercise} onRetry={retry} onSkip={onClose} />;
  }
  if (!q) return null;

  const inline = (q.q ?? "").includes("___");
  const [before, after] = (q.q ?? "").split("___");
  const tileState = (value: string): TileState => {
    if (checked === null) return picked === value ? "selected" : "idle";
    if (value === rightAnswer) return "right";
    return picked === value ? "wrong" : "dim";
  };

  const footer =
    checked !== null ? (
      <QuizButton buttonRef={nextRef} state={checked ? "ok" : "bad"} onClick={next}>{i + 1 >= qs.length ? "Xem kết quả" : "Tiếp theo"}</QuizButton>
    ) : choice ? (
      <QuizButton state="disabled">Tiếp theo</QuizButton>
    ) : (
      <QuizButton state={typed.trim() ? "idle" : "disabled"} onClick={() => grade(typed)}>Kiểm tra</QuizButton>
    );

  const answerText = ex.kind === "mcq" ? (q.options?.[Number(rightAnswer)] ?? rightAnswer) : (LABEL_TEXT[rightAnswer] ?? rightAnswer);

  return (
    <QuizShell
      progress={i / qs.length}
      badge={correctCount}
      title={TITLE[ex.kind] ?? "Bài tập"}
      top={
        <p className="text-center text-lg font-bold">
          <span className="text-emerald-400">✓ {correctCount}</span>
          <span className="ml-5 text-red-400">✗ {ok.length - correctCount}</span>
          <span className="ml-5 text-neutral-500">{i + 1}/{qs.length}</span>
        </p>
      }
      footer={footer}
      onExit={onClose}
    >
      <div className="space-y-5">
        <p className="text-sm text-neutral-400">{ex.instructions_vi}</p>
        {ex.bank && (
          <div className="flex flex-wrap gap-2" lang="en">
            {ex.bank.map((w) => <span key={w} className="rounded-xl bg-neutral-900 px-3 py-1.5 text-base font-semibold text-sky-300">{w}</span>)}
          </div>
        )}
        {ex.audio_text && (
          <div className="flex items-center gap-3 rounded-2xl bg-neutral-900 p-3 text-neutral-300">
            Nghe bài: <Say text={ex.audio_text} slow dialogue label="Nghe" />
          </div>
        )}
        {ex.passage && <p lang="en" className="max-h-56 overflow-y-auto rounded-2xl bg-neutral-900 p-4 text-base leading-relaxed whitespace-pre-wrap text-neutral-200">{ex.passage}</p>}

        <div className="rounded-3xl bg-neutral-900 p-5">
          {choice || !inline ? (
            <p lang="en" className="text-2xl font-bold leading-snug">{q.q}</p>
          ) : (
            <p lang="en" className="text-2xl font-bold leading-loose">
              {before}
              <span className="mx-1 inline-block min-w-24 border-b-4 border-sky-400 px-1 text-center text-sky-300">{typed || " "}</span>
              {after}
            </p>
          )}
          {q.base && <p className="mt-2 text-neutral-400">({q.base})</p>}
        </div>

        {choice && (
          <div className={`grid gap-3 ${ex.kind === "mcq" ? "grid-cols-1" : options.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {options.map((o, k) => (
              <QuizTile
                key={o.value}
                outline
                state={tileState(o.value)}
                disabled={checked !== null}
                onClick={() => {
                  setPicked(o.value);
                  grade(o.value);
                }}
              >
                <span lang="en">{ex.kind === "mcq" ? `${String.fromCharCode(65 + k)}. ${o.label}` : o.label}</span>
              </QuizTile>
            ))}
          </div>
        )}

        {!choice && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              grade(typed);
            }}
          >
            <input
              autoFocus
              lang="en"
              aria-label="Câu trả lời"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={checked !== null}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Gõ câu trả lời…"
              className="h-14 w-full rounded-2xl bg-neutral-900 px-4 text-xl text-white ring-1 ring-neutral-700 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </form>
        )}

        {checked !== null && (
          <FeedbackPanel ok={checked}>
            {!checked && <p lang="en" className="font-bold">✓ {answerText}</p>}
            {q.explain_vi ? <p className="text-neutral-300">{q.explain_vi}</p> : checked ? <p className="text-neutral-300">Làm tốt lắm!</p> : null}
          </FeedbackPanel>
        )}
      </div>
    </QuizShell>
  );
}
