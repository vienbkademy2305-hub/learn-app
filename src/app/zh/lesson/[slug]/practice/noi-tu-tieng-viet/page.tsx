import type { Metadata } from "next";
import { getLesson, getLessons, getSentence, getWord } from "@/content/load";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { type DeckItem, SayItBackDeck } from "@/features/speaking/SayItBackDeck";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Nói từ tiếng Việt · Bài ${lesson.number}` : "Nói từ tiếng Việt" };
}

/** Vietnamese → spoken Chinese: lesson sentences then words, checked by the browser's speech recognition. */
export default async function InterpretPracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const sentences: DeckItem[] = lesson.sentences
    .map(getSentence)
    .filter((s) => s !== undefined && !!s.vi?.text)
    .map((s) => ({ vi: s!.vi!.text, answer: s!.simplified, hints: s!.pinyin ? [s!.pinyin, s!.simplified] : [s!.simplified], note: s!.pinyin ?? undefined, audio: s!.audio.normal }));
  const words: DeckItem[] = lesson.words
    .map(getWord)
    .filter((w) => w !== undefined && w.meanings.length > 0)
    .map((w) => ({ vi: `Từ: ${w!.meanings[0]}`, answer: w!.simplified, hints: [w!.pinyin, w!.simplified], note: w!.pinyin }));
  return (
    <PracticeFrame slug={slug} current="interpret">
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900">Câu của bài</h3>
        <SayItBackDeck lang="zh" items={sentences} />
      </section>
      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900">Từ vựng</h3>
        <SayItBackDeck lang="zh" items={words} />
      </section>
      <p className="text-xs text-stone-500">
        Máy dùng nhận dạng giọng nói của trình duyệt (Chrome trên máy tính/Android, Safari trên iPhone; cần Internet) để kiểm tra bạn nói đúng chữ chưa. Chấm thanh điệu chi tiết: thẻ “Luyện nói”.
      </p>
    </PracticeFrame>
  );
}
