import { Badge } from "@/components/Badge";
import type { GrammarData, SentenceData } from "@/content/types";
import { structureParts } from "@/domain/grammar";
import { SentenceCard } from "@/features/sentences/SentenceCard";

/** Chinese runs inside Vietnamese text get the Han font. */
function Mixed({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\p{Script=Han}[\p{Script=Han}，。？！、…]*)/u).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} lang="zh-CN" className="font-han text-[1.08em] text-stone-900">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function GrammarPointCard({ point, index, examples, wordHref }: { point: GrammarData; index: number; examples: SentenceData[]; wordHref: (slug: string) => string }) {
  return (
    <article id={point.id} className="scroll-mt-20 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-stone-900">
          <span className="mr-2 text-brand-700">{index}.</span>
          <Mixed text={point.title} />
        </h3>
        {point.draft && (
          <span title="Nội dung do AI soạn, chưa được giáo viên duyệt.">
            <Badge tone="amber">Bản nháp</Badge>
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {point.structures.map((s) => (
          <p key={s} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-brand-50/60 px-3 py-2 text-sm">
            {structureParts(s).map((part, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-stone-400">+</span>}
                <span className={part.han ? "font-han rounded-md bg-white px-1.5 text-lg text-brand-700 ring-1 ring-brand-200" : "font-medium text-stone-700"} lang={part.han ? "zh-CN" : undefined}>
                  {part.text}
                </span>
              </span>
            ))}
          </p>
        ))}
      </div>

      <p className="mt-3 leading-relaxed text-stone-700">
        <Mixed text={point.explain} />
      </p>

      {point.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
          {point.notes.map((n) => (
            <li key={n}>
              <Mixed text={n} />
            </li>
          ))}
        </ul>
      )}

      {examples.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-stone-500">Ví dụ</p>
          <ul className="space-y-3">
            {examples.map((s) => (
              <li key={s.key} className="rounded-xl bg-stone-50 p-3">
                <SentenceCard sentence={s} wordHref={wordHref} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {point.mistakes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-stone-500">Lỗi người Việt hay mắc</p>
          <ul className="space-y-2">
            {point.mistakes.map((m) => (
              <li key={m.wrong} className="grid gap-1 rounded-xl p-3 text-sm ring-1 ring-stone-200 sm:grid-cols-2">
                <p className="text-brand-700">
                  ✗ <span lang="zh-CN" className="font-han text-lg line-through decoration-brand-300">{m.wrong}</span>
                </p>
                <p className="text-jade-700">
                  ✓ <span lang="zh-CN" className="font-han text-lg">{m.right}</span>
                </p>
                <p className="text-stone-500 sm:col-span-2">
                  <Mixed text={m.why} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
