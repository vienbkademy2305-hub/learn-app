import type { Metadata } from "next";
import { getLesson, getLessons, getWord } from "@/content/load";
import { knownCharsUpTo, modelSentences } from "@/features/practice/data";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { SentencePractice } from "@/features/practice/SentencePractice";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Đặt câu · Bài ${lesson.number}` : "Đặt câu" };
}

export default async function SentencePracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const words = getLesson(slug)!
    .words.map(getWord)
    .filter((w) => w !== undefined)
    .map((w) => ({ slug: w.slug, simplified: w.simplified, pinyin: w.pinyin, meaning: w.meanings[0] ?? null, models: modelSentences(slug, w.slug) }));
  return (
    <PracticeFrame slug={slug} current="sentences">
      <SentencePractice lessonSlug={slug} words={words} knownChars={knownCharsUpTo(slug)} />
    </PracticeFrame>
  );
}
