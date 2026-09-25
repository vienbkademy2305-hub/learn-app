import type { Metadata } from "next";
import { getLesson, getLessons, getSentence } from "@/content/load";
import { StepFooter } from "@/features/lesson/StepFooter";
import { SentenceCard } from "@/features/sentences/SentenceCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Câu ví dụ · Bài ${lesson.number}` : "Câu ví dụ" };
}

/** Step 2 — example sentences with audio. */
export default async function LessonExamplesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const lessonWords = new Set(lesson.words);
  const wordHref = (w: string) => (lessonWords.has(w) ? `/lesson/${slug}/word/${w}` : `/word/${w}`);
  const sentences = lesson.sentences.map(getSentence).filter((s) => s !== undefined);

  return (
    <section aria-labelledby="examples-title">
      <h2 id="examples-title" className="text-lg font-semibold text-stone-900">
        Câu ví dụ ({sentences.length})
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">Bấm vào một từ để xem chi tiết. Nghe audio thường rồi nghe chậm để bắt chước thanh điệu.</p>
      <ol className="space-y-3">
        {sentences.map((s, i) => (
          <li key={s.key} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <SentenceCard sentence={s} wordHref={wordHref} />
            </div>
          </li>
        ))}
      </ol>
      <StepFooter back={{ href: `/lesson/${slug}`, label: "Từ vựng" }} next={{ href: `/lesson/${slug}/summary`, label: "Tổng kết" }} />
    </section>
  );
}
