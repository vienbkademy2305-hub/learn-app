import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allWordSlugs, getWord } from "@/content/load";
import { WordDetail } from "@/features/vocabulary/WordDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return allWordSlugs().map((word) => ({ word }));
}

export async function generateMetadata({ params }: { params: Promise<{ word: string }> }): Promise<Metadata> {
  const w = getWord((await params).word);
  return { title: w ? `${w.simplified} (${w.pinyin})` : "Từ vựng" };
}

/** Standalone word page (e.g. from a sentence token outside the current lesson). */
export default async function WordPage({ params }: { params: Promise<{ word: string }> }) {
  const word = getWord((await params).word);
  if (!word) notFound();
  return (
    <div className="space-y-4">
      <Link href="/hsk/1" className="text-sm font-medium text-brand-700 hover:underline">
        ← Lộ trình HSK1
      </Link>
      <WordDetail word={word} />
    </div>
  );
}
