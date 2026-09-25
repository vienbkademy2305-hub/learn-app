import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, getLessons, lessonNeighbors } from "@/content/load";
import { StepTabs } from "@/features/lesson/StepTabs";
import { LessonProgress, MarkLessonStarted } from "@/features/progress/ProgressWidgets";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export default async function LessonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  const { prev, next } = lessonNeighbors(slug);

  return (
    <div className="space-y-6">
      <MarkLessonStarted slug={slug} />
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/hsk/1" className="hover:text-brand-700">
          HSK {lesson.hskLevel}
        </Link>{" "}
        › Bài {lesson.number}
      </nav>

      <header className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-700">Bài {lesson.number}</p>
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{lesson.title}</h1>
          </div>
          <div className="flex gap-2 text-sm">
            {prev && (
              <Link href={`/lesson/${prev.slug}`} className="rounded-lg px-3 py-1.5 text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100" title={prev.title}>
                ← Bài {prev.number}
              </Link>
            )}
            {next && (
              <Link href={`/lesson/${next.slug}`} className="rounded-lg px-3 py-1.5 text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100" title={next.title}>
                Bài {next.number} →
              </Link>
            )}
          </div>
        </div>
        <LessonProgress slug={slug} words={lesson.words} />
        <StepTabs slug={slug} />
      </header>

      {children}
    </div>
  );
}
