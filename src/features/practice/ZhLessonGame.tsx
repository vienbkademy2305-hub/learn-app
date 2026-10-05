"use client";
/** Practice step "Học thuộc (game)" (F4): the word games over one lesson's words; progress is shared with /zh/flashcards. */
import type { GameProgress, GameWord } from "@/domain/word-game";
import { speakChinese, useChineseVoice } from "@/features/audio/speech";
import { useProgress } from "@/features/progress/store";
import { WordGame } from "@/features/wordgame/WordGame";

export function ZhLessonGame({ words, lesson }: { words: GameWord[]; lesson: { number: number; title: string } }) {
  const [state, update, hydrated] = useProgress();
  const voice = useChineseVoice();
  if (!hydrated) return <p className="text-stone-400">Đang tải…</p>;
  const gp: GameProgress = { mastery: state.mastery ?? {}, cards: state.cards ?? {}, days: state.gameDays ?? [] };
  return (
    <div className="space-y-4">
      {voice === "unavailable" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          Trình duyệt này không có giọng đọc tiếng Trung, nên bậc “Nghe ra” được thay bằng câu chọn chữ. Dùng Chrome hoặc Edge để có phần nghe.
        </p>
      )}
      <WordGame
        lang="zh"
        words={words}
        lessons={[lesson]}
        studied={new Set([lesson.number])}
        gp={gp}
        update={(fn) => update((s) => {
          const next = fn({ mastery: s.mastery ?? {}, cards: s.cards ?? {}, days: s.gameDays ?? [] });
          return { ...s, mastery: next.mastery, cards: next.cards, gameDays: next.days };
        })}
        speak={(text, slow) => speakChinese(text, slow ? 0.6 : 0.85)}
        canListen={voice === "available"}
        lessonLabel="Bài"
        lockLesson={lesson.number}
      />
    </div>
  );
}
