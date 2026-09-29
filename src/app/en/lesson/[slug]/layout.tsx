import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { enLesson, enLessonNeighbors, enLessons, enLessonSteps } from "@/content/en";
import { EnStepTabs } from "@/features/en/LessonChrome";

export const dynamicParams = false;

export function generateStaticParams() {
  return enLessons().map((l) => ({ slug: l.slug }));
}

export default async function EnLessonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = enLesson(slug);
  if (!lesson) notFound();
  const { prev, next } = enLessonNeighbors(slug);
  const steps = enLessonSteps(lesson).map(({ type, label, path }) => ({ type, label, path }));
  const nav = "rounded-lg px-3 py-1.5 text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100";

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
        <Link href="/en" className="hover:text-sky-800">
          Tiếng Anh · Giai đoạn {lesson.stage}
        </Link>{" "}
        › Buổi {lesson.number}
      </nav>

      <header className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-sky-800">
              Buổi {lesson.number}
              {lesson.status === "draft" && <Badge tone="amber">Bản nháp</Badge>}
            </p>
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{lesson.title_vi}</h1>
            {lesson.focus?.grammar && <p className="mt-1 text-sm text-stone-500">Ngữ pháp: {lesson.focus.grammar}</p>}
          </div>
          <div className="flex gap-2 text-sm">
            {prev && (
              <Link href={`/en/lesson/${prev.slug}`} className={nav} title={prev.title_vi}>
                ← Buổi {prev.number}
              </Link>
            )}
            {next && (
              <Link href={`/en/lesson/${next.slug}`} className={nav} title={next.title_vi}>
                Buổi {next.number} →
              </Link>
            )}
          </div>
        </div>
        <EnStepTabs slug={slug} steps={steps} />
      </header>

      {children}
    </div>
  );
}
