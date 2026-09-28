import type { Metadata } from "next";
import { getLesson, getLessons } from "@/content/load";
import { lessonExerciseData } from "@/features/exercises/data";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { VocabRecall } from "@/features/practice/VocabRecall";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Nhớ từ vựng · Bài ${lesson.number}` : "Nhớ từ vựng" };
}

export default async function VocabPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <PracticeFrame slug={slug} current="vocab">
      <VocabRecall lessonSlug={slug} words={lessonExerciseData(slug).words} />
    </PracticeFrame>
  );
}
