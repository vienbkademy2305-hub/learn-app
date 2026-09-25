import Link from "next/link";
import { Badge, HskBadge } from "@/components/Badge";
import { getLesson, getSentence } from "@/content/load";
import type { WordData } from "@/content/types";
import { joinSinoViet } from "@/domain/display";
import { LearnedToggle } from "@/features/progress/ProgressWidgets";
import { SentenceCard } from "@/features/sentences/SentenceCard";

/**
 * Full word page. `lessonSlug` is set when opened from a lesson: token links
 * then stay inside that lesson when possible.
 */
export function WordDetail({ word, lessonSlug }: { word: WordData; lessonSlug?: string }) {
  const sinoViet = joinSinoViet(word.chars);
  const lessonWords = lessonSlug ? new Set(getLesson(lessonSlug)?.words ?? []) : new Set<string>();
  const wordHref = (slug: string) => (lessonSlug && lessonWords.has(slug) ? `/lesson/${lessonSlug}/word/${slug}` : `/word/${slug}`);
  const examples = word.examples.map(getSentence).filter((s) => s !== undefined);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 lang="zh-CN" className="font-han text-6xl leading-none text-stone-900 sm:text-7xl">{word.simplified}</h1>
            <p className="mt-3 text-2xl font-medium text-brand-700">{word.pinyin}</p>
            {word.traditional && word.traditional !== word.simplified && (
              <p className="mt-1 text-sm text-stone-500">
                Phồn thể: <span lang="zh-TW" className="font-han text-base text-stone-700">{word.traditional}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <HskBadge level={word.hskLevel} />
            <LearnedToggle word={word.slug} size="lg" />
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-stone-500">Hán Việt</dt>
            <dd className={sinoViet ? "text-lg font-semibold uppercase tracking-wide text-stone-900" : "italic text-stone-400"}>{sinoViet ?? "chưa có đủ dữ liệu"}</dd>
          </div>
          <div>
            <dt className="text-sm text-stone-500">Audio</dt>
            <dd className="text-sm text-stone-500">Chưa có audio riêng cho từ — nghe trong các câu ví dụ bên dưới.</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Nghĩa tiếng Việt</h2>
        {word.meanings.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-stone-800 marker:text-stone-400">
            {word.meanings.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 italic text-stone-400">Chưa có nghĩa tiếng Việt cho từ này.</p>
        )}
        {word.measureWords.length > 0 && (
          <p className="mt-3 text-sm text-stone-600">
            Lượng từ:{" "}
            {word.measureWords.map((m) => (
              <span key={m} lang="zh-CN" className="font-han mr-2 text-base text-stone-900">{m}</span>
            ))}
          </p>
        )}
        <p className="mt-4 text-xs text-stone-400">Nghĩa lấy từ hsk1-chinese-learning (nghĩa ngắn) và từ điển CVDICT (CC BY-SA 4.0).</p>
      </section>

      {word.meaningsEn.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-stone-900">Nghĩa tiếng Anh</h2>
          <ul lang="en" className="mt-3 list-disc space-y-1 pl-5 text-stone-600 marker:text-stone-300">
            {word.meaningsEn.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-stone-400">Nguồn: complete-hsk-vocabulary (dựa trên CC-CEDICT).</p>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Từng chữ</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {word.chars.map((c, i) => (
            <li key={`${c.hanzi}-${i}`} className="rounded-xl bg-stone-50 p-3 text-center">
              <p lang="zh-CN" className="font-han text-3xl text-stone-900">{c.hanzi}</p>
              <p className="text-sm text-brand-700">{c.pinyin ?? "—"}</p>
              <p className={c.sinoViet.length ? "text-sm font-medium uppercase text-stone-700" : "text-xs italic text-stone-400"}>
                {c.sinoViet.length ? c.sinoViet.join(" / ") : "chưa có Hán Việt"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Câu ví dụ ({examples.length})</h2>
        {examples.length === 0 ? (
          <p className="text-sm italic text-stone-400">Chưa có câu ví dụ.</p>
        ) : (
          <ul className="space-y-3">
            {examples.map((s) => (
              <li key={s.key} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <SentenceCard sentence={s} wordHref={wordHref} highlight={word.slug} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {word.lessons.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-stone-900">Có trong bài</h2>
          <div className="flex flex-wrap gap-2">
            {word.lessons.map((slug) => {
              const lesson = getLesson(slug);
              return lesson ? (
                <Link key={slug} href={`/lesson/${slug}`} className="hover:opacity-80">
                  <Badge tone="brand">
                    Bài {lesson.number}: {lesson.title}
                  </Badge>
                </Link>
              ) : null;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
