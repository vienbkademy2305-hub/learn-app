import type { Metadata } from "next";
import { getLesson, getLessons, getWord } from "@/content/load";
import { lessonCharacters } from "@/domain/display";
import { CopyPractice } from "@/features/practice/CopyPractice";
import { PracticeFrame } from "@/features/practice/PracticeFrame";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Tập chép chữ · Bài ${lesson.number}` : "Tập chép chữ" };
}

export default async function CopyPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const words = getLesson(slug)!.words.map(getWord).filter((w) => w !== undefined);
  return (
    <PracticeFrame slug={slug} current="copy">
      <CopyPractice characters={lessonCharacters(words)} />
    </PracticeFrame>
  );
}
