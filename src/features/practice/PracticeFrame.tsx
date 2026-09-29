import Link from "next/link";
import type { ReactNode } from "react";
import { StepFooter } from "@/features/lesson/StepFooter";
import { PRACTICE_TYPES, type PracticeType } from "./data";

/** Shared frame of the practice pages: title, switcher, back link and step footer. */
export function PracticeFrame({ slug, current, children }: { slug: string; current: PracticeType; children: ReactNode }) {
  const info = PRACTICE_TYPES.find((t) => t.type === current)!;
  return (
    <section aria-labelledby="practice-title" className="space-y-4">
      <div className="space-y-3">
        <div>
          <Link href={`/zh/lesson/${slug}/practice`} className="text-sm font-medium text-brand-700 hover:underline">
            ← Luyện tập
          </Link>
          <h2 id="practice-title" className="text-lg font-semibold text-stone-900">
            {info.icon} {info.title}
          </h2>
          <p className="text-sm text-stone-500">{info.description}</p>
        </div>
        <nav aria-label="Loại luyện tập" className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-1 rounded-xl bg-stone-100 p-1 text-sm">
            {PRACTICE_TYPES.map((t) => (
              <Link
                key={t.type}
                href={`/zh/lesson/${slug}/practice/${t.path}`}
                aria-current={t.type === current ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium ${t.type === current ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
              >
                {t.title}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      {children}
      <StepFooter back={{ href: `/zh/lesson/${slug}/practice`, label: "Luyện tập" }} next={{ href: `/zh/lesson/${slug}/exercises`, label: "Bài tập" }} />
    </section>
  );
}
