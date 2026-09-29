import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, getLessons, getSentence } from "@/content/load";
import { StepFooter } from "@/features/lesson/StepFooter";
import { PlayAll } from "@/features/audio/PlayAll";
import { ListenedMark, ListeningModes, RevealButton } from "@/features/listening/ListeningModes";
import { SentenceCard } from "@/features/sentences/SentenceCard";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Câu ví dụ & luyện nghe · Bài ${lesson.number}` : "Câu ví dụ" };
}

const LIST_ID = "example-sentences";

/** Step 3 — example sentences with audio and listening modes (docs/LISTENING_PLAN.md §2.1). */
export default async function LessonExamplesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const lessonWords = new Set(lesson.words);
  const wordHref = (w: string) => (lessonWords.has(w) ? `/zh/lesson/${slug}/word/${w}` : `/zh/word/${w}`);
  const sentences = lesson.sentences.map(getSentence).filter((s) => s !== undefined);

  return (
    <section aria-labelledby="examples-title">
      <h2 id="examples-title" className="text-lg font-semibold text-stone-900">
        Câu ví dụ & luyện nghe ({sentences.length})
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">
        Nghe tốc độ thường rồi chậm để bắt chước thanh điệu. Chọn chế độ ẩn chữ Hán, pinyin hoặc nghĩa để tự luyện nghe; bấm vào một từ để xem chi tiết.{" "}
        <Link href={`/zh/lesson/${slug}/exercises/listening`} className="font-medium text-brand-700 hover:underline">
          Làm bài nghe →
        </Link>
      </p>
      <ListeningModes listId={LIST_ID} sentenceKeys={sentences.map((s) => s.key)} />
      <PlayAll sentences={sentences.map((s) => ({ key: s.key, audio: s.audio, audioMs: s.audioMs }))} />
      <ol id={LIST_ID} data-hide="all" className="space-y-3">
        {sentences.map((s, i) => (
          <li
            key={s.key}
            id={`sentence-${s.key}`}
            data-sentence
            className="flex scroll-mt-40 gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-colors data-[playing=true]:border-brand-300 data-[playing=true]:bg-brand-50 data-[playing=true]:ring-2 data-[playing=true]:ring-brand-300 sm:p-5"
          >
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="mt-1 grid size-7 place-items-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <SentenceCard sentence={s} wordHref={wordHref} />
              <div className="flex flex-wrap items-center gap-3">
                <RevealButton />
                <ListenedMark sentenceKey={s.key} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <StepFooter back={{ href: `/zh/lesson/${slug}/grammar`, label: "Ngữ pháp" }} next={{ href: `/zh/lesson/${slug}/writing`, label: "Luyện viết" }} />
    </section>
  );
}
