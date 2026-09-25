import Link from "next/link";
import { Badge, HskBadge } from "@/components/Badge";
import type { SentenceData } from "@/content/types";
import { segmentSentence } from "@/domain/display";
import { AudioButtons } from "@/features/audio/AudioButtons";

/**
 * Hanzi (each word links to its detail page) · pinyin · Vietnamese · audio · HSK.
 * `wordHref` decides where a token links (inside the lesson or the global word page).
 */
export function SentenceCard({
  sentence,
  wordHref,
  highlight,
  size = "lg",
}: {
  sentence: SentenceData;
  wordHref: (wordSlug: string) => string;
  highlight?: string;
  size?: "lg" | "sm";
}) {
  const parts = segmentSentence(sentence.simplified, sentence.tokens);
  return (
    <div className="space-y-1.5">
      <p lang="zh-CN" className={`font-han leading-relaxed text-stone-900 ${size === "lg" ? "text-2xl" : "text-lg"}`}>
        {parts.map((p, i) =>
          p.word ? (
            <Link
              key={i}
              href={wordHref(p.word)}
              className={`rounded-sm underline-offset-4 hover:underline ${p.word === highlight ? "bg-brand-100 text-brand-800" : "hover:text-brand-700"}`}
            >
              {p.text}
            </Link>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
      {sentence.pinyin && <p className={`text-brand-700 ${size === "lg" ? "text-base" : "text-sm"}`}>{sentence.pinyin}</p>}
      {sentence.vi ? (
        <p className={`text-stone-700 ${size === "lg" ? "text-base" : "text-sm"}`}>
          {sentence.vi.text}
          {sentence.vi.draft && (
            <Badge tone="amber" className="ml-2 align-middle">
              Bản dịch nháp
            </Badge>
          )}
        </p>
      ) : (
        <p className="text-sm italic text-stone-400">Chưa có bản dịch tiếng Việt</p>
      )}
      {sentence.en && (
        <p lang="en" className={`text-stone-500 ${size === "lg" ? "text-sm" : "text-xs"}`}>
          <span className="mr-1.5 rounded bg-stone-100 px-1 py-px text-[10px] font-semibold text-stone-500">EN</span>
          {sentence.en}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <AudioButtons audio={sentence.audio} compact={size === "sm"} />
        <HskBadge level={sentence.hskLevel} />
      </div>
    </div>
  );
}
