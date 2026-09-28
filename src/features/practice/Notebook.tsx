"use client";
import Link from "next/link";
import { isDue } from "@/domain/progress";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { useProgress } from "@/features/progress/store";
import type { FlashWord } from "./data";
import { Flashcards, SaveWordButton } from "./Flashcards";

type NotebookWord = FlashWord & { lesson: { slug: string; number: number } | null };

/** The learner's saved words across all lessons, with a flashcard deck over them. */
export function Notebook({ words }: { words: NotebookWord[] }) {
  const [state, , hydrated] = useProgress();
  if (!hydrated) return <p className="text-stone-400">Đang tải…</p>;

  const saved = words.filter((w) => state.saved?.[w.slug]).sort((a, b) => state.saved![b.slug]!.localeCompare(state.saved![a.slug]!));
  if (saved.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-stone-600 shadow-sm">
        <p className="text-4xl" aria-hidden="true">☆</p>
        <p className="mt-2 font-medium">Sổ từ đang trống.</p>
        <p className="mt-1 text-sm text-stone-500">
          Khi ôn flashcard ở phần <strong>Luyện tập</strong> của mỗi bài, bấm <strong>☆ Lưu vào Sổ từ</strong> để gom các từ khó về đây.
        </p>
        <Link href="/hsk/1" className="mt-4 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Đến lộ trình HSK1
        </Link>
      </div>
    );
  }

  const due = saved.filter((w) => isDue(state, w.slug)).length;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-stone-900">Ôn flashcard</h2>
        <Flashcards words={saved} savedFilter={false} />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-stone-900">
          Từ đã lưu ({saved.length}) <span className="text-sm font-normal text-stone-500">· {due} cần ôn</span>
        </h2>
        <ul className="divide-y divide-stone-100">
          {saved.map((w) => (
            <li key={w.slug} className="flex flex-wrap items-center gap-3 py-2.5">
              <span lang="zh-CN" className="font-han w-20 text-2xl text-stone-900">{w.simplified}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-brand-700">{w.pinyin}</span>
                <span className="block text-sm text-stone-600">{w.meanings.slice(0, 2).join("; ")}</span>
              </span>
              <SpeakButtons text={w.simplified} compact />
              {w.lesson && (
                <Link href={`/lesson/${w.lesson.slug}/word/${w.slug}`} className="text-sm text-stone-500 hover:text-brand-700">
                  Bài {w.lesson.number}
                </Link>
              )}
              <SaveWordButton slug={w.slug} compact />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
