import type { Metadata } from "next";
import { getLessons } from "@/content/load";
import { allFlashWords, allGameWords } from "@/features/practice/data";
import { ZhStudy } from "@/features/practice/ZhStudy";

export const metadata: Metadata = { title: "Sổ từ & học thuộc" };

/** Word notebook (saved words as flashcards) and the word games over every HSK lesson. */
export default function NotebookPage() {
  const words = allGameWords();
  const lessons = getLessons()
    .filter((l) => words.some((w) => w.lesson === l.number))
    .map((l) => ({ slug: l.slug, number: l.number, title: l.title }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Sổ từ & học thuộc</h1>
        <p className="mt-1 text-stone-500">
          <strong>Sổ từ</strong>: những từ bạn đã lưu, ôn bằng flashcard. <strong>Học thuộc</strong>: game nối từ, chọn từ, nghe chọn và nghĩa tiếng Anh → chữ Hán — thuộc rồi thì từ được hẹn ôn sau 3 ngày.
        </p>
      </div>
      <ZhStudy notebook={allFlashWords()} words={words} lessons={lessons} />
    </div>
  );
}
