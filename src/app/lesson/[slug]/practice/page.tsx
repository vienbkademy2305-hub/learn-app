import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, getLessons } from "@/content/load";
import { StepFooter } from "@/features/lesson/StepFooter";
import { PRACTICE_TYPES } from "@/features/practice/data";
import { PracticeHubStatus } from "@/features/practice/PracticeHubStatus";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Luyện tập · Bài ${lesson.number}` : "Luyện tập" };
}

/** Step 5 — practice hub: vocabulary recall, flashcards, copybook, own sentences, paragraph. Not scored. */
export default async function LessonPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  return (
    <section aria-labelledby="practice-hub-title">
      <h2 id="practice-hub-title" className="text-lg font-semibold text-stone-900">
        Luyện tập
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">Ôn và tự luyện trước khi làm bài tập có chấm điểm. Không tính điểm — luyện bao nhiêu lần cũng được.</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_TYPES.map((t) => (
          <li key={t.type}>
            <Link
              href={`/lesson/${slug}/practice/${t.path}`}
              className="flex h-full flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden="true">{t.icon}</span>
              <span className="text-lg font-semibold text-stone-900">{t.title}</span>
              <span className="text-sm text-stone-500">{t.description}</span>
              <PracticeHubStatus type={t.type} lessonSlug={slug} words={lesson.words} />
            </Link>
          </li>
        ))}
      </ul>
      <StepFooter back={{ href: `/lesson/${slug}/writing`, label: "Luyện viết" }} next={{ href: `/lesson/${slug}/exercises`, label: "Bài tập" }} />
    </section>
  );
}
