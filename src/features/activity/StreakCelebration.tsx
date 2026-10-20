"use client";
/** "N chuỗi ngày liên tiếp" screen shown after the first learning of a day, with the week strip (Monday first). */
import { streakOf, weekPeriod } from "@/domain/activity";
import { QuizButton, QuizShell } from "@/features/quiz/QuizShell";
import { useActivity } from "./store";

const HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function StreakCelebration({ onContinue }: { onContinue: () => void }) {
  const [activity] = useActivity();
  const streak = streakOf(activity);
  const week = weekPeriod(activity, 0);
  return (
    <QuizShell progress={1} onExit={onContinue} footer={<QuizButton onClick={onContinue}>Tiếp tục</QuizButton>}>
      <div className="flex flex-col items-center pt-10 text-center">
        <div className="relative grid size-44 place-items-center" aria-hidden>
          <span className="text-[9rem] leading-none drop-shadow-[0_0_30px_rgba(251,191,36,.45)]">🔥</span>
          <span className="absolute bottom-3 text-6xl font-black text-white [text-shadow:0_3px_0_#b45309]">{streak.current}</span>
        </div>
        <h2 className="mt-4 text-4xl font-extrabold text-amber-300">chuỗi ngày liên tiếp</h2>
        <ul className="mt-10 grid w-full grid-cols-7 gap-1 text-center">
          {week.cells.map((c, i) =>
            c ? (
              <li key={c.key}>
                <p className="text-sm font-semibold text-neutral-500">{HEAD[i]}</p>
                <p className={`mx-auto mt-2 grid size-12 place-items-center rounded-full text-xl font-extrabold ${c.done ? "bg-gradient-to-b from-amber-300 to-orange-500 text-black" : c.today ? "ring-2 ring-neutral-600 text-white" : "text-neutral-500"}`}>
                  {c.day}
                </p>
              </li>
            ) : null,
          )}
        </ul>
        <p className="mt-10 text-xl text-neutral-300">
          <strong className="text-amber-300">Chuỗi liên tiếp</strong> đếm số ngày bạn đã học liên tục
        </p>
      </div>
    </QuizShell>
  );
}
