import type { Metadata } from "next";
import { getLesson, getLessons } from "@/content/load";
import { lessonExerciseData } from "@/features/exercises/data";
import { CharacterExercise } from "@/features/exercises/CharacterExercise";
import { ExercisePage } from "@/features/exercises/ExercisePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Viết chữ · Bài ${lesson.number}` : "Viết chữ" };
}

export default async function CharacterExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { words } = lessonExerciseData(slug);
  return (
    <ExercisePage slug={slug} current="characters">
      <CharacterExercise lessonSlug={slug} words={words} />
    </ExercisePage>
  );
}
