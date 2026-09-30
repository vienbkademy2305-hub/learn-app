"use client";
/** /zh/flashcards: "Sổ từ" (saved words as flashcards) or "Học thuộc" (word games over the HSK lessons); ?mode=game opens the games. */
import { useEffect, useMemo, useState } from "react";
import type { GameProgress, GameWord } from "@/domain/word-game";
import { speakChinese, useChineseVoice } from "@/features/audio/speech";
import { useProgress } from "@/features/progress/store";
import { WordGame } from "@/features/wordgame/WordGame";
import type { FlashWord } from "./data";
import { Notebook } from "./Notebook";

type NotebookWord = FlashWord & { lesson: { slug: string; number: number } | null };

export function ZhStudy({ notebook, words, lessons }: { notebook: NotebookWord[]; words: GameWord[]; lessons: Array<{ slug: string; number: number; title: string }> }) {
  const [mode, setMode] = useState<"notebook" | "game" | null>(null);
  const [state, update, hydrated] = useProgress();
  const voice = useChineseVoice();
  useEffect(() => setMode(new URLSearchParams(window.location.search).get("mode") === "game" ? "game" : "notebook"), []);
  const studied = useMemo(() => new Set(lessons.filter((l) => state.lessons[l.slug]?.startedAt).map((l) => l.number)), [lessons, state.lessons]);
  const gp: GameProgress = { mastery: state.mastery ?? {}, cards: state.cards ?? {}, days: state.gameDays ?? [] };
  const tab = (on: boolean) => `rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"}`;
  const choose = (m: "notebook" | "game") => {
    setMode(m);
    const url = new URL(window.location.href);
    if (m === "game") url.searchParams.set("mode", "game");
    else url.searchParams.delete("mode");
    window.history.replaceState(null, "", url);
  };

  if (!hydrated || mode === null) return <p className="text-stone-400">Đang tải…</p>;
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "notebook"} className={tab(mode === "notebook")} onClick={() => choose("notebook")}>☆ Sổ từ</button>
        <button type="button" role="tab" aria-selected={mode === "game"} className={tab(mode === "game")} onClick={() => choose("game")}>🎯 Học thuộc (game)</button>
      </div>
      {mode === "notebook" ? (
        <Notebook words={notebook} />
      ) : (
        <>
          {voice === "unavailable" && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              Trình duyệt này không có giọng đọc tiếng Trung, nên bậc “Nghe ra” được thay bằng câu chọn chữ. Dùng Chrome hoặc Edge để có phần nghe.
            </p>
          )}
          <WordGame
            lang="zh"
            words={words}
            lessons={lessons}
            studied={studied}
            gp={gp}
            update={(fn) => update((s) => {
              const next = fn({ mastery: s.mastery ?? {}, cards: s.cards ?? {}, days: s.gameDays ?? [] });
              return { ...s, mastery: next.mastery, cards: next.cards, gameDays: next.days };
            })}
            speak={(text, slow) => speakChinese(text, slow ? 0.6 : 0.85)}
            canListen={voice === "available"}
            lessonLabel="Bài"
          />
        </>
      )}
    </div>
  );
}
