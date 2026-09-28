import type { Metadata } from "next";
import { getLesson, getLessons, getSentence, getWord } from "@/content/load";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { SpeakingPractice } from "@/features/speaking/SpeakingPractice";
import { sentenceTarget, wordTarget } from "@/features/speaking/targets";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Luyện nói · Bài ${lesson.number}` : "Luyện nói" };
}

/** Speaking practice: record words and sentences, scored on the device (docs/SPEAKING_PLAN.md). */
export default async function SpeakingPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const words = lesson.words.map(getWord).filter((w) => w !== undefined).map(wordTarget);
  const sentences = lesson.sentences
    .map(getSentence)
    .filter((s) => s !== undefined && (s.audio.normal || s.audio.slow))
    .map((s) => sentenceTarget(s!));
  return (
    <PracticeFrame slug={slug} current="speaking">
      <SpeakingPractice words={words} sentences={sentences} />
    </PracticeFrame>
  );
}
