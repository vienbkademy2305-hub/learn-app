import type { Metadata } from "next";
import { enLesson, enLessonNeighbors, enLessons, enLessonWords, enStep, enStepNeighbors } from "@/content/en";
import { enTests } from "@/content/en-tests";
import { HomeworkBox } from "@/features/en/HomeworkBox";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Bài về nhà · Buổi ${lesson.number}` : "Bài về nhà" };
}

/** Step 7 — the writing homework: prompt, word counter, draft saved in this browser. */
export default async function EnHomeworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const hw = enStep(lesson, "homework");
  const { back } = enStepNeighbors(lesson, "homework");
  const { next } = enLessonNeighbors(lesson.slug);
  // after Buổi 5/10/15/20 the next step is the test of that block (the exit test after the last lesson of a stage)
  const due = enTests().filter((t) => t.after_lesson === lesson.number);
  const test = due.find((t) => t.kind === "mini") ?? due[0];
  return (
    <div className="space-y-4">
      {hw && (
        <HomeworkBox
          slug={lesson.slug}
          prompt={hw.prompt_vi}
          promptEn={hw.prompt_en}
          words={hw.words}
          minutes={hw.minutes}
          vocabulary={enLessonWords(lesson).map((w) => w.headword)}
        />
      )}
      <StepFooter
        back={back}
        next={test ? { href: `/en/kiem-tra/${test.id}`, label: "Làm bài kiểm tra" } : next ? { href: `/en/lesson/${next.slug}`, label: `Buổi ${next.number}` } : { href: "/en", label: "Về lộ trình" }}
      />
    </div>
  );
}
