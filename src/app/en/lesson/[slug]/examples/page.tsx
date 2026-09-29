import type { Metadata } from "next";
import { enLesson, enLessons, enLessonWords, enSentence, enStep, enStepNeighbors } from "@/content/en";
import type { EnSentence } from "@/content/en-types";
import { EnSentenceRow } from "@/features/en/Cards";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Câu ví dụ · Buổi ${lesson.number}` : "Câu ví dụ" };
}

/** Step 4 — example sentences of the lesson, lesson words in bold, normal and slow audio. */
export default async function EnExamplesPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const sentences = (enStep(lesson, "examples")?.items ?? []).map(enSentence).filter((s): s is EnSentence => !!s);
  const heads = enLessonWords(lesson).map((w) => w.headword);
  const { back, next } = enStepNeighbors(lesson, "examples");
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Nghe từng câu, đọc to theo, rồi che phần tiếng Việt và tự dịch lại.</p>
      <ol className="space-y-3">
        {sentences.map((s) => <EnSentenceRow key={s.id} sentence={s} heads={heads} />)}
      </ol>
      <StepFooter back={back} next={next} />
    </div>
  );
}
