import type { Metadata } from "next";
import { enLesson, enLessons, enStep, enStepNeighbors } from "@/content/en";
import { EnSkillCard } from "@/features/en/Cards";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Kỹ năng · Buổi ${lesson.number}` : "Kỹ năng" };
}

/** Stage 2+ — how to tackle the lesson's IELTS task type: procedure, tips, traps, useful language, a worked demo. */
export default async function EnSkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const skill = enStep(lesson, "skill");
  const { back, next } = enStepNeighbors(lesson, "skill");
  return (
    <div className="space-y-6">
      {skill && <EnSkillCard skill={skill} draft={lesson.status === "draft"} />}
      <StepFooter back={back} next={next} />
    </div>
  );
}
