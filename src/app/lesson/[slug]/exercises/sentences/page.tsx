import type { Metadata } from "next";
import { getLesson, getLessons } from "@/content/load";
import { lessonExerciseData } from "@/features/exercises/data";
import { SentenceExercise } from "@/features/exercises/SentenceExercise";
import { ExercisePage } from "@/features/exercises/ExercisePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Bài viết · Bài ${lesson.number}` : "Bài viết" };
}

export default async function SentenceExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { words, sentences } = lessonExerciseData(slug);
  return (
    <ExercisePage slug={slug} current="sentences">
      <SentenceExercise lessonSlug={slug} words={words} sentences={sentences} />
    </ExercisePage>
  );
}
