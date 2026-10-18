"use client";
import type { GameWord } from "@/domain/word-game";
import { useProgress } from "@/features/progress/store";
import { AiChat } from "./AiChat";

/** Chinese AI chat with the learner's word-game progress, for "Săn từ". */
export function ZhAiChat({ words }: { words: GameWord[] }) {
  const [progress] = useProgress();
  return <AiChat lang="zh" words={words} mastery={progress.mastery ?? {}} />;
}
