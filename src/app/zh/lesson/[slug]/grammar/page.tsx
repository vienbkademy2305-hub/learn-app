import type { Metadata } from "next";
import { getLesson, getLessons, getSentence, lessonGrammar } from "@/content/load";
import { GrammarPointCard } from "@/features/grammar/GrammarPointCard";
import { GrammarQuiz } from "@/features/grammar/GrammarQuiz";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Ngữ pháp · Bài ${lesson.number}` : "Ngữ pháp" };
}

/** Step 2 — grammar points of the lesson, with examples, common mistakes and a quick check. */
export default async function LessonGrammarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const points = lessonGrammar(slug);
  const lessonWords = new Set(getLesson(slug)!.words);
  const wordHref = (w: string) => (lessonWords.has(w) ? `/zh/lesson/${slug}/word/${w}` : `/zh/word/${w}`);

  return (
    <section aria-labelledby="grammar-title" className="space-y-4">
      <div>
        <h2 id="grammar-title" className="text-lg font-semibold text-stone-900">
          Ngữ pháp ({points.length} điểm)
        </h2>
        <p className="mt-1 text-sm text-stone-500">Đọc cấu trúc, nghe câu ví dụ, xem lỗi hay gặp, rồi làm phần “Câu nào đúng?” ở cuối trang.</p>
      </div>

      {points.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-stone-500">Bài này chưa có nội dung ngữ pháp.</p>
      ) : (
        <>
          <nav aria-label="Các điểm ngữ pháp" className="flex flex-wrap gap-2 text-sm">
            {points.map((p, i) => (
              <a key={p.id} href={`#${p.id}`} className="rounded-full bg-white px-3 py-1.5 text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
                {i + 1}. {p.title}
              </a>
            ))}
          </nav>
          {points.map((p, i) => (
            <GrammarPointCard key={p.id} point={p} index={i + 1} examples={p.examples.map(getSentence).filter((s) => s !== undefined)} wordHref={wordHref} />
          ))}
          <div id="grammar-quiz" className="scroll-mt-20 space-y-3">
            <h3 className="text-lg font-semibold text-stone-900">Câu nào đúng?</h3>
            <GrammarQuiz lessonSlug={slug} points={points.map((p) => ({ title: p.title, mistakes: p.mistakes }))} />
          </div>
          {points.some((p) => p.draft) && (
            <p className="text-xs text-stone-400">Giải thích ngữ pháp là bản nháp do AI soạn, chưa được giáo viên duyệt. Câu ví dụ lấy từ bộ câu HSK có audio (hsk-sentences-audio).</p>
          )}
        </>
      )}

      <StepFooter back={{ href: `/zh/lesson/${slug}`, label: "Từ vựng" }} next={{ href: `/zh/lesson/${slug}/examples`, label: "Câu ví dụ" }} />
    </section>
  );
}
