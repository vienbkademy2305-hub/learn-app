import type { Metadata } from "next";
import { getLesson, getLessons, getSentence, getWord } from "@/content/load";
import { paragraphTask } from "@/domain/practice";
import { knownCharsUpTo } from "@/features/practice/data";
import { ParagraphPractice } from "@/features/practice/ParagraphPractice";
import { PracticeFrame } from "@/features/practice/PracticeFrame";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Viết đoạn văn · Bài ${lesson.number}` : "Viết đoạn văn" };
}

export default async function ParagraphPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const words = lesson.words
    .map(getWord)
    .filter((w) => w !== undefined)
    .map((w) => ({ slug: w.slug, simplified: w.simplified, pinyin: w.pinyin }));
  const models = lesson.sentences
    .map(getSentence)
    .filter((s) => s !== undefined)
    .slice(0, 8)
    .map((s) => ({ simplified: s.simplified, vi: s.vi?.text ?? null }));
  return (
    <PracticeFrame slug={slug} current="paragraph">
      <ParagraphPractice lessonSlug={slug} task={paragraphTask(lesson, words.length)} words={words} knownChars={knownCharsUpTo(slug)} models={models} />
    </PracticeFrame>
  );
}
