"use client";
import type { GameWord } from "@/domain/word-game";
import { useEnProgress } from "@/features/en/progress";
import { AiChat } from "./AiChat";

/** English AI chat with the learner's word-game progress, for "Săn từ". */
export function EnAiChat({ words }: { words: GameWord[] }) {
  const [progress] = useEnProgress();
  return <AiChat lang="en" words={words} mastery={progress.mastery} />;
}
