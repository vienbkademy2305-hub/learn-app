import type { Metadata } from "next";
import { getLesson, getLessons, getWord } from "@/content/load";
import { lessonCharacters } from "@/domain/display";
import { StepFooter } from "@/features/lesson/StepFooter";
import { CharacterPicker } from "@/features/writing/CharacterPicker";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Luyện viết · Bài ${lesson.number}` : "Luyện viết" };
}

/** Step 3 — stroke order and writing practice for every character of the lesson. */
export default async function LessonWritingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getLesson(slug)!;
  const words = lesson.words.map(getWord).filter((w) => w !== undefined);
  const characters = lessonCharacters(words);
  const wordLinks = Object.fromEntries(words.map((w) => [w.slug, { href: `/lesson/${slug}/word/${w.slug}`, simplified: w.simplified, pinyin: w.pinyin }]));

  return (
    <section aria-labelledby="writing-title">
      <h2 id="writing-title" className="text-lg font-semibold text-stone-900">
        Luyện viết ({characters.length} chữ)
      </h2>
      <p className="mb-4 mt-1 text-sm text-stone-500">
        Bấm <strong>Xem viết mẫu</strong> để xem thứ tự nét, <strong>Từng nét</strong> để xem chậm từng nét, rồi <strong>Tự viết thử</strong> để tập viết — máy sẽ chấm từng nét.
      </p>
      <CharacterPicker characters={characters} wordLinks={wordLinks} />
      <StepFooter back={{ href: `/lesson/${slug}/examples`, label: "Câu ví dụ" }} next={{ href: `/lesson/${slug}/summary`, label: "Tổng kết" }} />
    </section>
  );
}
