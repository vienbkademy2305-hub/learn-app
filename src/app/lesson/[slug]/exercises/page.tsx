import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, getLessons } from "@/content/load";
import { EXERCISE_TYPES } from "@/features/exercises/data";
import { ExerciseScore } from "@/features/exercises/ExerciseScores";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Bài tập · Bài ${lesson.number}` : "Bài tập" };
}

/** Step 6 — exercise hub: listening, sentence writing, character writing. */
export default async function LessonExercisesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <section aria-labelledby="exercises-title">
      <h2 id="exercises-title" className="text-lg font-semibold text-stone-900">
        Bài tập
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">Chọn một loại bài tập. Điểm cao nhất của bạn được lưu lại.</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {EXERCISE_TYPES.map((t) => (
          <li key={t.type}>
            <Link
              href={`/lesson/${slug}/exercises/${t.path}`}
              className="flex h-full flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden="true">{t.icon}</span>
              <span className="text-lg font-semibold text-stone-900">{t.title}</span>
              <span className="text-sm text-stone-500">{t.description}</span>
              <span className="mt-auto pt-2 text-sm text-stone-500">
                Điểm cao nhất: <ExerciseScore lessonSlug={slug} type={t.type} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <StepFooter back={{ href: `/lesson/${slug}/practice`, label: "Luyện tập" }} next={{ href: `/lesson/${slug}/summary`, label: "Tổng kết" }} />
    </section>
  );
}
