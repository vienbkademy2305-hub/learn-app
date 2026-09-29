import type { Metadata } from "next";
import { enContent, enLesson, enLessons, enSentence, enStep, enStepNeighbors } from "@/content/en";
import type { EnSentence } from "@/content/en-types";
import { EnGrammarCard } from "@/features/en/Cards";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Ngữ pháp · Buổi ${lesson.number}` : "Ngữ pháp" };
}

/** Step 3 — the grammar point(s): structure, explanation, table, typical Vietnamese mistakes, examples. */
export default async function EnGrammarPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const { grammar } = enContent();
  const points = (enStep(lesson, "grammar")?.items ?? []).map((id) => grammar[id]).filter((g) => !!g);
  const { back, next } = enStepNeighbors(lesson, "grammar");
  return (
    <div className="space-y-6">
      {points.map((g) => (
        <EnGrammarCard key={g.id} point={g} examples={(g.examples ?? []).map(enSentence).filter((s): s is EnSentence => !!s)} />
      ))}
      <StepFooter back={back} next={next} />
    </div>
  );
}
