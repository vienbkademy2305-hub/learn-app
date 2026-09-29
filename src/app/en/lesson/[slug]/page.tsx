import type { Metadata } from "next";
import Link from "next/link";
import { enLesson, enLessons, enLessonWords, enSentencesFor, enStepNeighbors } from "@/content/en";
import { EnWordCard } from "@/features/en/Cards";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Buổi ${lesson.number}: ${lesson.title_vi}` : "Bài học" };
}

/** Step 1 — vocabulary of the lesson with IPA, meaning, forms and one example each. */
export default async function EnVocabularyPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const words = enLessonWords(lesson);
  const own = `b${String(lesson.number).padStart(2, "0")}-`;
  const { next } = enStepNeighbors(lesson, "vocabulary");
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        {words.length} từ / cụm từ. Bấm loa để nghe (giọng máy, ưu tiên Anh-Anh), bấm vào từ để xem chi tiết.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {words.map((w) => {
          const examples = enSentencesFor(w.id);
          return (
            <li key={w.id}>
              <EnWordCard word={w} example={examples.find((s) => s.id.startsWith(own)) ?? examples[0]} />
            </li>
          );
        })}
      </ul>
      <p className="text-sm">
        <Link href={`/en/flashcards/?lesson=${lesson.number}`} className="font-medium text-sky-800 hover:underline">
          Ôn các từ này bằng flashcard →
        </Link>
      </p>
      <StepFooter back={{ href: "/en", label: "Danh sách buổi" }} next={next} />
    </div>
  );
}
