"use client";
/** One "nói từ tiếng Việt" card at a time, with previous / next / random (English or Chinese). */
import { useState } from "react";
import type { SpeechLang } from "@/domain/speech-match";
import { speakChinese } from "@/features/audio/speech";
import { speakEnglish } from "@/features/en/speech";
import { assetUrl } from "@/lib/storage-url";
import { SayItBack } from "./SayItBack";

export type DeckItem = { vi: string; answer: string; hints: string[]; note?: string; /** storage key of a recorded mp3 (Chinese) */ audio?: string };

function play(lang: SpeechLang, item: DeckItem) {
  if (item.audio) {
    void new Audio(assetUrl(item.audio)).play().catch(() => lang === "zh" && speakChinese(item.answer, 0.8));
    return;
  }
  if (lang === "zh") speakChinese(item.answer, 0.8);
  else speakEnglish(item.answer, 0.9);
}

export function SayItBackDeck({ lang, items, onScore }: { lang: SpeechLang; items: DeckItem[]; onScore?: (item: DeckItem, score: number) => void }) {
  const [i, setI] = useState(0);
  if (!items.length) return <p className="text-sm text-stone-500">Bài này chưa có câu để luyện.</p>;
  const item = items[i % items.length]!;
  const nav = "rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50";
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">Câu {(i % items.length) + 1}/{items.length}</p>
      <SayItBack
        lang={lang}
        vi={item.vi}
        answer={item.answer}
        hints={item.hints}
        answerNote={item.note}
        play={() => play(lang, item)}
        onScore={(s) => onScore?.(item, s)}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setI((n) => (n - 1 + items.length) % items.length)} className={nav}>← Câu trước</button>
        <button type="button" onClick={() => setI((n) => (n + 1) % items.length)} className={nav}>Câu sau →</button>
        <button type="button" onClick={() => setI(Math.floor(Math.random() * items.length))} className={nav}>🎲 Ngẫu nhiên</button>
      </div>
    </div>
  );
}
