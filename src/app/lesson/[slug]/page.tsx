import type { Metadata } from "next";
import { getLesson, getLessons, getSentence, getWord } from "@/content/load";
import { StepFooter } from "@/features/lesson/StepFooter";
import { WordCard } from "@/features/vocabulary/WordCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Bài ${lesson.number}: ${lesson.title}` : "Bài học" };
}

/** Step 1 — vocabulary. */
export default async function LessonVocabularyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const lessonSentences = new Set(lesson.sentences);
  const words = lesson.words.map(getWord).filter((w) => w !== undefined);

  return (
    <section aria-labelledby="vocab-title">
      <h2 id="vocab-title" className="mb-4 text-lg font-semibold text-stone-900">
        Từ vựng ({words.length})
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {words.map((w) => {
          const exampleKey = w.examples.find((k) => lessonSentences.has(k)) ?? w.examples[0];
          return (
            <li key={w.slug}>
              <WordCard word={w} example={exampleKey ? (getSentence(exampleKey) ?? null) : null} href={`/lesson/${slug}/word/${w.slug}`} />
            </li>
          );
        })}
      </ul>
      <StepFooter back={{ href: "/hsk/1", label: "Danh sách bài" }} next={{ href: `/lesson/${slug}/examples`, label: "Câu ví dụ" }} />
    </section>
  );
}
