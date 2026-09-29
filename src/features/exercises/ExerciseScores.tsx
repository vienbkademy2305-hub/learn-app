"use client";
import Link from "next/link";
import { exerciseKey, type ExerciseType } from "@/domain/progress";
import { useProgress } from "@/features/progress/store";

/** Best score of one exercise type for one lesson ("—" when never done). */
export function ExerciseScore({ lessonSlug, type }: { lessonSlug: string; type: ExerciseType }) {
  const [state, , hydrated] = useProgress();
  const r = state.exercises?.[exerciseKey(lessonSlug, type)];
  if (!hydrated || !r) return <span className="text-stone-400">Chưa làm</span>;
  const ratio = r.best / r.total;
  return (
    <span className={ratio === 1 ? "font-semibold text-jade-700" : ratio >= 0.5 ? "font-semibold text-amber-700" : "font-semibold text-brand-700"}>
      {r.best}/{r.total}
    </span>
  );
}

/** Row of the three scores, each linking to its exercise. */
export function ExerciseScoreRow({ lessonSlug, items }: { lessonSlug: string; items: ReadonlyArray<{ type: ExerciseType; path: string; title: string; icon: string }> }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <Link key={it.type} href={`/zh/lesson/${lessonSlug}/exercises/${it.path}`} className="rounded-xl bg-stone-50 p-2 text-center text-sm ring-1 ring-stone-200 hover:ring-brand-300">
          <span className="block text-stone-600">
            {it.icon} {it.title}
          </span>
          <ExerciseScore lessonSlug={lessonSlug} type={it.type} />
        </Link>
      ))}
    </div>
  );
}
