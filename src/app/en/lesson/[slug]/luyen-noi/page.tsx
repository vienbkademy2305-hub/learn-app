import type { Metadata } from "next";
import { enLesson, enLessons, enSpeakingItems, enStep, enStepNeighbors } from "@/content/en";
import { LessonSpeaking } from "@/features/en/LessonSpeaking";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Luyện nói · Buổi ${lesson.number}` : "Luyện nói" };
}

/** Speaking step — read the lesson's words, sentences and dialogue aloud, scored by OpenPronounce. */
export default async function EnSpeakingStepPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const { back, next } = enStepNeighbors(lesson, "speaking");
  return (
    <div className="space-y-4">
      <LessonSpeaking slug={lesson.slug} items={enSpeakingItems(lesson)} dialogue={enStep(lesson, "dialogue")?.lines ?? []} />
      <StepFooter back={back} next={next} />
    </div>
  );
}
