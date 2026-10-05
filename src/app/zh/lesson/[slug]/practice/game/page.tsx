import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, getLessons } from "@/content/load";
import { allGameWords } from "@/features/practice/data";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { ZhLessonGame } from "@/features/practice/ZhLessonGame";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Học thuộc · Bài ${lesson.number}` : "Học thuộc" };
}

export default async function GamePracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  return (
    <PracticeFrame slug={slug} current="game">
      <ZhLessonGame words={allGameWords().filter((w) => w.lesson <= lesson.number && w.lesson > lesson.number - 6)} lesson={{ number: lesson.number, title: lesson.title }} />
      <p className="text-sm text-stone-500">
        Tiến độ dùng chung với{" "}
        <Link href="/zh/flashcards/?mode=game" className="font-medium text-brand-700 hover:underline">
          Học thuộc
        </Link>{" "}
        ở Sổ từ, nơi bạn ôn từ của nhiều bài cùng lúc.
      </p>
    </PracticeFrame>
  );
}
