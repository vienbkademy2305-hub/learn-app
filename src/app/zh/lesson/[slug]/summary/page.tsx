import type { Metadata } from "next";
import { getLesson, getLessons, getWord, lessonNeighbors } from "@/content/load";
import { StepFooter } from "@/features/lesson/StepFooter";
import { LessonSummaryPanel } from "@/features/progress/ProgressWidgets";
import { EXERCISE_TYPES } from "@/features/exercises/data";
import { ExerciseScoreRow } from "@/features/exercises/ExerciseScores";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Tổng kết · Bài ${lesson.number}` : "Tổng kết" };
}

/** Step 7 — lesson summary and completion. */
export default async function LessonSummaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const { next } = lessonNeighbors(slug);
  const words = lesson.words
    .map(getWord)
    .filter((w) => w !== undefined)
    .map((w) => ({ slug: w.slug, simplified: w.simplified, pinyin: w.pinyin }));

  return (
    <section aria-label="Tổng kết bài học">
      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-stone-900">Điểm bài tập</h2>
        <ExerciseScoreRow lessonSlug={slug} items={EXERCISE_TYPES} />
      </div>
      <LessonSummaryPanel slug={slug} words={words} next={next ? { slug: next.slug, number: next.number, title: next.title } : null} />
      <StepFooter back={{ href: `/zh/lesson/${slug}/exercises`, label: "Bài tập" }} next={next ? { href: `/zh/lesson/${next.slug}`, label: `Bài ${next.number}` } : { href: "/zh/hsk/1", label: "Về lộ trình" }} />
    </section>
  );
}
