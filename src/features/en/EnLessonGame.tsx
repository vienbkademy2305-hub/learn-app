"use client";
/** Vocabulary step: the word games over this lesson's words (F4), opened on demand; progress is shared with /en/flashcards. */
import { useState } from "react";
import type { GameProgress, GameWord } from "@/domain/word-game";
import { isPassed } from "@/domain/word-game";
import { WordGame } from "@/features/wordgame/WordGame";
import { useEnProgress } from "./progress";
import { speakEnglish } from "./speech";

export function EnLessonGame({ words, lesson }: { words: GameWord[]; lesson: { number: number; title: string } }) {
  const [open, setOpen] = useState(false);
  const [progress, update, hydrated] = useEnProgress();
  const own = words.filter((w) => w.lesson === lesson.number);
  if (!own.length) return null;
  const passed = hydrated ? own.filter((w) => isPassed(progress.mastery[w.id])).length : 0;
  const gp: GameProgress = { mastery: progress.mastery, cards: progress.cards, days: progress.gameDays };
  return (
    <section aria-labelledby="lesson-game-title" className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="lesson-game-title" className="text-lg font-semibold text-stone-900">🎯 Học thuộc từ của buổi này</h2>
          <p className="text-sm text-stone-500">
            Nối từ, chọn từ, nghe và gõ lại, đọc định nghĩa tiếng Anh đoán từ. {hydrated && `Đã thuộc ${passed}/${own.length} từ.`}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800"
        >
          {open ? "Thu gọn" : "Chơi"}
        </button>
      </div>
      {open && hydrated && (
        <WordGame
          lang="en"
          words={words}
          lessons={[lesson]}
          studied={new Set([lesson.number])}
          gp={gp}
          update={(fn) => update((p) => {
            const next = fn({ mastery: p.mastery, cards: p.cards, days: p.gameDays });
            return { ...p, mastery: next.mastery, cards: next.cards, gameDays: next.days };
          })}
          speak={(text, slow) => speakEnglish(text, slow ? 0.7 : 0.9)}
          canListen
          lessonLabel="Buổi"
          lockLesson={lesson.number}
        />
      )}
    </section>
  );
}
