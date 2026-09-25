import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, getLessons, getWord } from "@/content/load";
import { WordDetail } from "@/features/vocabulary/WordDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().flatMap((l) => l.words.map((word) => ({ slug: l.slug, word })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; word: string }> }): Promise<Metadata> {
  const w = getWord((await params).word);
  return { title: w ? `${w.simplified} (${w.pinyin})` : "Từ vựng" };
}

/** Word detail inside a lesson, with previous/next word of the same lesson. */
export default async function LessonWordPage({ params }: { params: Promise<{ slug: string; word: string }> }) {
  const { slug, word: wordSlug } = await params;
  const lesson = getLesson(slug);
  const word = getWord(wordSlug);
  if (!lesson || !word) notFound();

  const i = lesson.words.indexOf(wordSlug);
  const prev = i > 0 ? getWord(lesson.words[i - 1]!) : undefined;
  const next = i >= 0 ? getWord(lesson.words[i + 1] ?? "") : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href={`/lesson/${slug}`} className="font-medium text-brand-700 hover:underline">
          ← Danh sách từ vựng
        </Link>
        <span className="text-stone-500">
          Từ {i + 1}/{lesson.words.length}
        </span>
      </div>

      <WordDetail word={word} lessonSlug={slug} />

      <nav aria-label="Từ trước và sau" className="grid grid-cols-2 gap-3">
        {prev ? (
          <Link href={`/lesson/${slug}/word/${prev.slug}`} className="rounded-xl border border-stone-200 bg-white p-3 hover:border-brand-300">
            <span className="block text-xs text-stone-500">← Từ trước</span>
            <span lang="zh-CN" className="font-han text-xl">{prev.simplified}</span> <span className="text-sm text-stone-500">{prev.pinyin}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/lesson/${slug}/word/${next.slug}`} className="rounded-xl border border-stone-200 bg-white p-3 text-right hover:border-brand-300">
            <span className="block text-xs text-stone-500">Từ tiếp →</span>
            <span lang="zh-CN" className="font-han text-xl">{next.simplified}</span> <span className="text-sm text-stone-500">{next.pinyin}</span>
          </Link>
        ) : (
          <Link href={`/lesson/${slug}/examples`} className="rounded-xl bg-brand-600 p-3 text-right font-semibold text-white hover:bg-brand-700">
            <span className="block text-xs font-normal text-brand-100">Hết từ vựng</span>
            Sang câu ví dụ →
          </Link>
        )}
      </nav>
    </div>
  );
}
