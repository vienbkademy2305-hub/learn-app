"use client";
import { useState } from "react";
import { useProgress } from "@/features/progress/store";
import { SpeakingPanel, type SpeakTarget } from "./SpeakingPanel";

/** Lesson speaking practice: pick a word or a sentence, then record and get scored. */
export function SpeakingPractice({ words, sentences }: { words: SpeakTarget[]; sentences: SpeakTarget[] }) {
  const [tab, setTab] = useState<"word" | "sentence">("word");
  const list = tab === "word" ? words : sentences;
  const [selected, setSelected] = useState<Record<"word" | "sentence", number>>({ word: 0, sentence: 0 });
  const current = list[selected[tab]] ?? list[0];
  const [state, , hydrated] = useProgress();

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Luyện nói từ hay câu" className="flex w-max gap-1 rounded-xl bg-stone-100 p-1 text-sm">
        {(["word", "sentence"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 font-medium ${tab === t ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
          >
            {t === "word" ? `Từ (${words.length})` : `Câu (${sentences.length})`}
          </button>
        ))}
      </div>

      <ul className="flex max-h-44 flex-wrap gap-2 overflow-y-auto" aria-label={tab === "word" ? "Chọn từ" : "Chọn câu"}>
        {list.map((t, i) => {
          const best = hydrated ? state.speaking?.[t.key]?.best : undefined;
          const active = t.key === current?.key;
          return (
            <li key={t.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected((s) => ({ ...s, [tab]: i }))}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 ring-1 ring-inset ${
                  active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-brand-300"
                }`}
              >
                <span lang="zh-CN" className={`font-han ${tab === "word" ? "text-lg" : "max-w-[14rem] truncate text-sm"}`}>{t.hanzi}</span>
                {best !== undefined && (
                  <span className={`text-xs ${active ? "text-white/80" : best >= 80 ? "text-jade-700" : best >= 60 ? "text-amber-700" : "text-brand-700"}`}>{best}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {current && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <SpeakingPanel key={current.key} target={current} />
        </div>
      )}
    </div>
  );
}
