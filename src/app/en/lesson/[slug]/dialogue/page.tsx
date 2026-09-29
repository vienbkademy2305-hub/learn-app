import type { Metadata } from "next";
import { enLesson, enLessons, enStep, enStepNeighbors } from "@/content/en";
import { DialoguePlayer } from "@/features/en/DialoguePlayer";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Hội thoại · Buổi ${lesson.number}` : "Hội thoại" };
}

/** Step 5 — a short dialogue using the lesson's words and grammar; play all, or hide one side to role-play. */
export default async function EnDialoguePage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const dialogue = enStep(lesson, "dialogue");
  const { back, next } = enStepNeighbors(lesson, "dialogue");
  return (
    <div className="space-y-4">
      {dialogue && <DialoguePlayer title={dialogue.title_vi ?? "Hội thoại"} lines={dialogue.lines} />}
      <StepFooter back={back} next={next} />
    </div>
  );
}
