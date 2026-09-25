"use client";
import Link from "next/link";
import { useState } from "react";
import type { LessonCharacter } from "@/domain/display";
import { StrokeWriter } from "./StrokeWriter";

/**
 * Pick a character, then watch its stroke order or practise writing it.
 * `wordLinks` (optional) shows the words of the lesson that use the character.
 */
export function CharacterPicker({
  characters,
  wordLinks,
}: {
  characters: LessonCharacter[];
  wordLinks?: Record<string, { href: string; simplified: string; pinyin: string }>;
}) {
  const [index, setIndex] = useState(0);
  const current = characters[index];
  if (!current) return null;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="order-2 md:order-1">
        <p className="mb-2 text-sm text-stone-500">Chọn chữ ({characters.length})</p>
        <ul className="flex flex-wrap gap-2">
          {characters.map((c, i) => (
            <li key={c.hanzi}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={`font-han grid size-12 place-items-center rounded-xl text-2xl ring-1 ring-inset transition-colors ${
                  i === index ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-brand-300"
                }`}
                lang="zh-CN"
              >
                {c.hanzi}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="order-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:order-2 md:w-80">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p>
            <span lang="zh-CN" className="font-han mr-2 text-3xl">{current.hanzi}</span>
            <span className="text-brand-700">{current.pinyin ?? ""}</span>
          </p>
          <p className={current.sinoViet.length ? "text-sm font-semibold uppercase text-stone-700" : "text-xs italic text-stone-400"}>
            {current.sinoViet.length ? current.sinoViet[0] : "chưa có Hán Việt"}
          </p>
        </div>
        <StrokeWriter key={current.hanzi} hanzi={current.hanzi} strokeKey={current.stroke} />
        {wordLinks && current.words.length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <p className="mb-1.5 text-xs text-stone-500">Có trong từ:</p>
            <div className="flex flex-wrap gap-1.5">
              {current.words.map((slug) => {
                const w = wordLinks[slug];
                return w ? (
                  <Link key={slug} href={w.href} className="rounded-lg bg-stone-50 px-2 py-1 text-sm ring-1 ring-stone-200 hover:ring-brand-300">
                    <span lang="zh-CN" className="font-han">{w.simplified}</span> <span className="text-xs text-stone-500">{w.pinyin}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
