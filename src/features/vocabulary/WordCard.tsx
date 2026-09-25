import Link from "next/link";
import { HskBadge } from "@/components/Badge";
import type { SentenceData, WordData } from "@/content/types";
import { joinSinoViet } from "@/domain/display";
import { LearnedToggle } from "@/features/progress/ProgressWidgets";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { SpeakButtons } from "@/features/audio/SpeakButtons";

const MAX_MEANINGS = 3;

export function WordCard({ word, example, href }: { word: WordData; example: SentenceData | null; href: string }) {
  const sinoViet = joinSinoViet(word.chars);
  const shown = word.meanings.slice(0, MAX_MEANINGS);
  const more = word.meanings.length - shown.length;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="group min-w-0">
          <p lang="zh-CN" className="font-han text-4xl leading-tight text-stone-900 group-hover:text-brand-700">{word.simplified}</p>
          <p className="mt-1 text-lg font-medium text-brand-700">{word.pinyin}</p>
        </Link>
        <div className="flex flex-col items-end gap-2">
          <HskBadge level={word.hskLevel} />
          <SpeakButtons text={word.simplified} compact />
        </div>
      </div>

      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 text-stone-500">Hán Việt:</dt>
          <dd className={sinoViet ? "font-medium uppercase tracking-wide text-stone-800" : "italic text-stone-400"}>{sinoViet ?? "chưa có"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-stone-500">Nghĩa:</dt>
          <dd className="text-stone-800">
            {shown.length > 0 ? shown.join("; ") : <span className="italic text-stone-400">chưa có nghĩa tiếng Việt</span>}
            {more > 0 && <span className="text-stone-400"> (+{more} nghĩa)</span>}
          </dd>
        </div>
        {word.meaningsEn.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-stone-500">Tiếng Anh:</dt>
            <dd lang="en" className="text-stone-500">{word.meaningsEn.slice(0, 2).join("; ")}</dd>
          </div>
        )}
      </dl>

      {example && (
        <div className="mt-3 rounded-xl bg-stone-50 p-3">
          <p lang="zh-CN" className="font-han text-base text-stone-900">{example.simplified}</p>
          {example.vi && <p className="mt-0.5 text-sm text-stone-600">{example.vi.text}</p>}
          {example.en && <p lang="en" className="mt-0.5 text-xs text-stone-400">{example.en}</p>}
          <div className="mt-2">
            <AudioButtons audio={example.audio} compact />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <LearnedToggle word={word.slug} />
        <Link href={href} className="text-sm font-medium text-brand-700 hover:underline">
          Chi tiết →
        </Link>
      </div>
    </article>
  );
}
