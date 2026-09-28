import Link from "next/link";
import type { ReactNode } from "react";
import { EXERCISE_TYPES } from "./data";

/** Shared frame of the three exercise pages: title, switcher and back link. */
export function ExercisePage({ slug, current, children }: { slug: string; current: (typeof EXERCISE_TYPES)[number]["type"]; children: ReactNode }) {
  const info = EXERCISE_TYPES.find((t) => t.type === current)!;
  return (
    <section aria-labelledby="exercise-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/lesson/${slug}/exercises`} className="text-sm font-medium text-brand-700 hover:underline">
            ← Bài tập
          </Link>
          <h2 id="exercise-title" className="text-lg font-semibold text-stone-900">
            {info.icon} {info.title}
          </h2>
          <p className="text-sm text-stone-500">{info.description}</p>
        </div>
        <nav aria-label="Loại bài tập" className="flex gap-1 rounded-xl bg-stone-100 p-1 text-sm">
          {EXERCISE_TYPES.map((t) => (
            <Link
              key={t.type}
              href={`/lesson/${slug}/exercises/${t.path}`}
              aria-current={t.type === current ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 font-medium ${t.type === current ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {t.title}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </section>
  );
}
