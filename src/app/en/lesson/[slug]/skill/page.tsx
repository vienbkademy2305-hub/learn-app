import type { Metadata } from "next";
import { enLesson, enLessons, enStep, enStepNeighbors } from "@/content/en";
import { EnSkillCard } from "@/features/en/Cards";
import { Study4Hint } from "@/features/site/Study4Hint";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Kỹ năng · Buổi ${lesson.number}` : "Kỹ năng" };
}

const STUDY4_GROUP: Record<string, string> = {
  listening: "IELTS Listening",
  reading: "IELTS Academic Reading",
  writing: "IELTS Writing",
  speaking: "IELTS Speaking",
};

/** Stage 2+ — how to tackle the lesson's IELTS task type: procedure, tips, traps, useful language, a worked demo. */
export default async function EnSkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const skill = enStep(lesson, "skill");
  const { back, next } = enStepNeighbors(lesson, "skill");
  return (
    <div className="space-y-6">
      {skill && <EnSkillCard skill={skill} draft={lesson.status === "draft"} />}
      {skill && STUDY4_GROUP[skill.skill] && <Study4Hint group={STUDY4_GROUP[skill.skill]!} seed={lesson.number} />}
      <StepFooter back={back} next={next} />
    </div>
  );
}
