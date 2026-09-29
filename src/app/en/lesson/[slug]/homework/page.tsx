import type { Metadata } from "next";
import { enLesson, enLessonNeighbors, enLessons, enLessonWords, enStep, enStepNeighbors } from "@/content/en";
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
      <StepFooter back={back} next={next ? { href: `/en/lesson/${next.slug}`, label: `Buổi ${next.number}` } : { href: "/en", label: "Về lộ trình" }} />
    </div>
  );
}
