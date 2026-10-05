"use client";
import { isDue, noteKey } from "@/domain/progress";
import { isPassed } from "@/domain/word-game";
import { useProgress } from "@/features/progress/store";
import type { PracticeType } from "./data";

/** One-line status under each practice card (due cards, sentences written…). */
export function PracticeHubStatus({ type, lessonSlug, words }: { type: PracticeType; lessonSlug: string; words: string[] }) {
  const [state, , hydrated] = useProgress();
  if (!hydrated) return <span className="mt-auto pt-2 text-sm text-stone-400">&nbsp;</span>;

  let text: string | null = null;
  if (type === "flashcards") {
    const due = words.filter((w) => isDue(state, w)).length;
    const saved = words.filter((w) => state.saved?.[w]).length;
    text = `${due} thẻ cần ôn${saved ? ` · ★ ${saved} đã lưu` : ""}`;
  } else if (type === "game") {
    text = `Đã thuộc ${words.filter((w) => isPassed(state.mastery?.[w])).length}/${words.length} từ`;
  } else if (type === "sentences") {
    text = `Đã đặt ${words.filter((w) => state.notes?.[noteKey.sentence(lessonSlug, w)]).length}/${words.length} câu`;
  } else if (type === "speaking") {
    const done = words.filter((w) => state.speaking?.[`word:${w}`]).length;
    text = done ? `Đã luyện nói ${done}/${words.length} từ` : "Chưa luyện nói";
  } else if (type === "paragraph") {
    text = state.notes?.[noteKey.paragraph(lessonSlug)] ? "Đã có bản nháp" : "Chưa viết";
  }
  return <span className="mt-auto pt-2 text-sm text-stone-500">{text ?? " "}</span>;
}
