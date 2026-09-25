import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { content, getWord } from "@/content/load";
import { LessonProgress, LevelProgress } from "@/features/progress/ProgressWidgets";

export const dynamicParams = false;

/** Only HSK1 exists in PHASE 2; the route is level-generic for HSK2–6 later. */
export function generateStaticParams() {
  return [{ level: content().level }];
}

export const metadata: Metadata = { title: "Lộ trình HSK1" };

export default async function HskLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const { lessons } = content();
  if (level !== content().level) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-700">Lộ trình</p>
        <h1 className="text-3xl font-bold text-stone-900">HSK {level}</h1>
        <p className="mt-1 text-stone-500">{lessons.length} bài học theo chủ đề. Học từ vựng, xem câu ví dụ, rồi tổng kết từng bài.</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <LevelProgress lessons={lessons} />
      </div>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {lessons.map((lesson) => {
          const preview = lesson.words.slice(0, 6).map((w) => getWord(w)?.simplified).filter(Boolean);
          return (
            <li key={lesson.slug}>
              <Link
                href={`/lesson/${lesson.slug}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{lesson.number}</span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900">{lesson.title}</h2>
                    <p className="text-sm text-stone-500">
                      {lesson.words.length} từ · {lesson.sentences.length} câu
                    </p>
                  </div>
                </div>
                <p lang="zh-CN" className="font-han truncate text-lg text-stone-700">{preview.join(" · ")}</p>
                <div className="mt-auto">
                  <LessonProgress slug={lesson.slug} words={lesson.words} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
