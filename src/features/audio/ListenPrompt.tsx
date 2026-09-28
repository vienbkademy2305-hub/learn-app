"use client";
import { useEffect } from "react";
import { SpeakerIcon } from "./SpeakerIcon";
import { speakChinese } from "./speech";

/**
 * Large "Nghe / Chậm" buttons for listening questions. The text is spoken once
 * when the question appears (right after a click, so browsers allow speech).
 */
export function ListenPrompt({ text, rate = 0.85, slowRate = 0.5 }: { text: string; rate?: number; slowRate?: number }) {
  useEffect(() => {
    const t = window.setTimeout(() => speakChinese(text, rate), 250);
    return () => window.clearTimeout(t);
  }, [text, rate]);
  const btn = "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold ring-1 ring-inset transition-colors";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => speakChinese(text, rate)} className={`${btn} bg-brand-600 text-white ring-brand-600 hover:bg-brand-700`}>
        <SpeakerIcon className="size-5" /> Nghe
      </button>
      <button type="button" onClick={() => speakChinese(text, slowRate)} className={`${btn} bg-white text-stone-700 ring-stone-300 hover:bg-stone-100`}>
        <SpeakerIcon className="size-5" /> Chậm
      </button>
    </div>
  );
}
