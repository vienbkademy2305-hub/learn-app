"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { markStep, useEnProgress } from "./progress";

type StepLink = { type: string; label: string; path: string };

function activeStep(pathname: string, base: string, steps: StepLink[]): string {
  const rest = pathname.replace(/\/$/, "").slice(base.length);
  return steps.find((s) => s.path && (rest === s.path || rest.startsWith(`${s.path}/`)))?.type ?? "vocabulary";
}

/** Step tabs of an English lesson; also records which steps the learner opened. */
export function EnStepTabs({ slug, steps }: { slug: string; steps: StepLink[] }) {
  const base = `/en/lesson/${slug}`;
  const active = activeStep(usePathname() ?? "", base, steps);
  const [progress, update, hydrated] = useEnProgress();
  useEffect(() => update(markStep(slug, active)), [slug, active, update]);
  const seen = new Set(hydrated ? (progress.steps[slug] ?? []) : []);

  return (
    <nav aria-label="Các bước của bài học" className="-mx-4 overflow-x-auto px-4">
      <ol className="flex min-w-max gap-2">
        {steps.map((s, i) => (
          <li key={s.type}>
            <Link
              href={`${base}${s.path}`}
              aria-current={active === s.type ? "step" : undefined}
              className={`block rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                active === s.type
                  ? "bg-stone-900 text-white ring-stone-900"
                  : seen.has(s.type)
                    ? "bg-sky-50 text-sky-900 ring-sky-200 hover:bg-sky-100"
                    : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-100"
              }`}
            >
              {i + 1}. {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Lesson list with per-lesson progress (steps opened, exercise score) for /en. */
export function EnLessonList({
  lessons,
}: {
  lessons: Array<{ slug: string; number: number; title: string; focus: string; steps: number; exercises: string[]; draft: boolean }>;
}) {
  const [progress, , hydrated] = useEnProgress();
  const stats = (l: (typeof lessons)[number]) => {
    const seen = hydrated ? (progress.steps[l.slug]?.length ?? 0) : 0;
    const done = l.exercises.filter((id) => progress.exercises[id]).length;
    const correct = l.exercises.reduce((n, id) => n + (progress.exercises[id]?.correct ?? 0), 0);
    const total = l.exercises.reduce((n, id) => n + (progress.exercises[id]?.total ?? 0), 0);
    return { seen, done, pct: total ? Math.round((correct / total) * 100) : null };
  };
  const next = hydrated ? lessons.find((l) => stats(l).done < l.exercises.length) : undefined;

  return (
    <div className="space-y-4">
      {next && (hydrated && Object.keys(progress.steps).length > 0) && (
        <Link href={`/en/lesson/${next.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-sky-800">
          Học tiếp: Buổi {next.number} · {next.title} →
        </Link>
      )}
      <ol className="grid gap-3 sm:grid-cols-2">
        {lessons.map((l) => {
          const s = stats(l);
          const complete = l.exercises.length > 0 && s.done === l.exercises.length;
          return (
            <li key={l.slug}>
              <Link
                href={`/en/lesson/${l.slug}`}
                className="flex h-full gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-300"
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${
                    complete ? "bg-jade-600 text-white" : s.seen ? "bg-sky-100 text-sky-800" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {l.number}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-stone-900">{l.title}</span>
                  <span className="block text-sm text-stone-500">{l.focus}</span>
                  <span className="mt-1 block text-xs text-stone-400">
                    {s.seen ? `Đã mở ${s.seen}/${l.steps} bước` : "Chưa học"}
                    {s.done > 0 && ` · Bài tập ${s.done}/${l.exercises.length}${s.pct !== null ? ` (${s.pct}%)` : ""}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
