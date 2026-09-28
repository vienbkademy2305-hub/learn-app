import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, getLessons } from "@/content/load";
import { lessonFlashWords } from "@/features/practice/data";
import { Flashcards } from "@/features/practice/Flashcards";
import { PracticeFrame } from "@/features/practice/PracticeFrame";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Flashcard · Bài ${lesson.number}` : "Flashcard" };
}

export default async function FlashcardPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PracticeFrame slug={slug} current="flashcards">
      <Flashcards words={lessonFlashWords(slug)} emptyHint="Chưa lưu từ nào của bài này. Bấm ☆ trên thẻ để lưu từ khó." />
      <p className="text-sm text-stone-500">
        Từ đã lưu ở mọi bài nằm trong{" "}
        <Link href="/flashcards" className="font-medium text-brand-700 hover:underline">
          Sổ từ
        </Link>
        .
      </p>
    </PracticeFrame>
  );
}
