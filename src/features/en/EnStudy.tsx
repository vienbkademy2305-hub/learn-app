"use client";
/** English flashcards page: "Lật thẻ" (Leitner deck) or "Học thuộc" (word games) — ?mode=game opens the games. */
import { useEffect, useMemo, useState } from "react";
import type { GameProgress, GameWord } from "@/domain/word-game";
import { WordGame } from "@/features/wordgame/WordGame";
import { type Card, EnFlashcards } from "./EnFlashcards";
import { useEnProgress } from "./progress";
import { speakEnglish } from "./speech";

export function EnStudy({ cards, words, lessons }: { cards: Card[]; words: GameWord[]; lessons: Array<{ number: number; title: string }> }) {
  const [mode, setMode] = useState<"cards" | "game" | null>(null);
  const [progress, update, hydrated] = useEnProgress();
  useEffect(() => setMode(new URLSearchParams(window.location.search).get("mode") === "game" ? "game" : "cards"), []);
  const studied = useMemo(
    () => new Set(lessons.filter((l) => Object.keys(progress.steps).some((s) => s.startsWith(`buoi-${String(l.number).padStart(2, "0")}-`))).map((l) => l.number)),
    [lessons, progress.steps],
  );
  const gp: GameProgress = { mastery: progress.mastery, cards: progress.cards, days: progress.gameDays };
  const tab = (on: boolean) => `rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"}`;
  const choose = (m: "cards" | "game") => {
    setMode(m);
    const url = new URL(window.location.href);
    if (m === "game") url.searchParams.set("mode", "game");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  };

  if (!hydrated || mode === null) return <p className="text-stone-500">Đang tải…</p>;
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "cards"} className={tab(mode === "cards")} onClick={() => choose("cards")}>🃏 Lật thẻ</button>
        <button type="button" role="tab" aria-selected={mode === "game"} className={tab(mode === "game")} onClick={() => choose("game")}>🎯 Học thuộc (game)</button>
      </div>
      {mode === "cards" ? (
        <EnFlashcards cards={cards} lessons={lessons} />
      ) : (
        <WordGame
          lang="en"
          words={words}
          lessons={lessons}
          studied={studied}
          gp={gp}
          update={(fn) => update((p) => {
            const next = fn({ mastery: p.mastery, cards: p.cards, days: p.gameDays });
            return { ...p, mastery: next.mastery, cards: next.cards, gameDays: next.days };
          })}
          speak={(text, slow) => speakEnglish(text, slow ? 0.7 : 0.9)}
          canListen
          lessonLabel="Buổi"
        />
      )}
    </div>
  );
}
