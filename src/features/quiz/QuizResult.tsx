"use client";
/** "Nhiệm vụ hoàn thành!" screen: stars, right answers, reward / time / accuracy, retry or skip. */
import { clock, percentOf, starsFor } from "@/domain/quiz";
import { QuizButton, QuizShell } from "./QuizShell";

function Star({ on, size }: { on: boolean; size: string }) {
  return (
    <span aria-hidden className={`${size} drop-shadow ${on ? "text-amber-300" : "text-neutral-800"}`}>
      ★
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`flex-1 rounded-2xl px-3 py-4 text-center ${tone}`}>
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

export function QuizResult({
  correct,
  total,
  seconds,
  xp,
  title = "Nhiệm vụ hoàn thành!",
  onRetry,
  onSkip,
}: {
  correct: number;
  total: number;
  seconds: number;
  xp: number;
  title?: string;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const stars = starsFor(correct, total);
  const pct = percentOf(correct, total);
  const accTone = pct >= 70 ? "bg-emerald-950 text-emerald-300" : pct >= 40 ? "bg-amber-950 text-amber-300" : "bg-red-950 text-red-300";
  const label = pct >= 85 ? "XUẤT SẮC" : pct >= 70 ? "TỐT" : pct >= 40 ? "KHÁ" : "CỐ LÊN";
  return (
    <QuizShell
      progress={1}
      onExit={onSkip}
      footer={
        <div className="flex w-full flex-col items-stretch gap-1">
          <QuizButton onClick={onRetry}>Thử lại</QuizButton>
          <button type="button" onClick={onSkip} className="h-10 text-lg font-bold text-neutral-500 hover:text-neutral-300">Bỏ qua</button>
        </div>
      }
    >
      <div className="flex flex-col items-center pt-6 text-center">
        <div className="flex items-end gap-1" role="img" aria-label={`${stars} trên 3 sao`}>
          <Star on={stars >= 1} size="text-7xl" />
          <Star on={stars >= 2} size="text-8xl" />
          <Star on={stars >= 3} size="text-7xl" />
        </div>
        <h2 className="mt-8 text-4xl font-extrabold">{title}</h2>
        <p className="mt-3 text-xl text-neutral-400">
          Bạn đã trả lời đúng <strong className="text-emerald-400">{correct}</strong>/{total} câu hỏi
        </p>
        <div className="mt-8 flex w-full gap-3">
          <Stat label="Thưởng" value={`+${xp} XP`} tone="bg-amber-950 text-amber-300" />
          <Stat label="Thời gian" value={clock(seconds)} tone="bg-indigo-950 text-indigo-300" />
          <Stat label={label} value={`${pct}%`} tone={accTone} />
        </div>
      </div>
    </QuizShell>
  );
}
