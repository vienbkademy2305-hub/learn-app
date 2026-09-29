import type { Metadata } from "next";
import { enLesson, enLessons, enStep, enStepNeighbors } from "@/content/en";
import { ExerciseSet } from "@/features/en/ExerciseSet";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Bài tập · Buổi ${lesson.number}` : "Bài tập" };
}

/** Step 6 — the lesson's exercises, graded in the browser; the best score is kept per exercise. */
export default async function EnExercisesPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const exercises = enStep(lesson, "exercises")?.items ?? [];
  const { back, next } = enStepNeighbors(lesson, "exercises");
  return (
    <div className="space-y-4">
      <ExerciseSet exercises={exercises} />
      <StepFooter back={back} next={next} />
    </div>
  );
}
