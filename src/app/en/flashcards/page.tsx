import type { Metadata } from "next";
import { enContent, enGameWords, enLessonWords, enSentencesFor } from "@/content/en";
import type { Card } from "@/features/en/EnFlashcards";
import { EnStudy } from "@/features/en/EnStudy";

export const metadata: Metadata = { title: "Ôn từ bằng flashcard" };

export default function EnFlashcardsPage() {
  const { lessons } = enContent();
  // One card per word, under the lesson that first teaches it (Buổi 20 only reviews old words).
  const seen = new Set<string>();
  const cards: Card[] = [];
  for (const l of lessons)
    for (const w of enLessonWords(l)) {
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      const ex = enSentencesFor(w.id)[0];
      cards.push({
        id: w.id,
        headword: w.headword,
        pos: w.pos,
        ipa: w.ipa?.uk ?? w.ipa?.us ?? null,
        meaning: w.meaning_vi.join("; "),
        example: ex ? { text: ex.text, vi: ex.vi } : null,
        lesson: l.number,
      });
    }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Flashcard & học thuộc từ</h1>
        <p className="mt-1 text-stone-500">
          <strong>Lật thẻ</strong>: thẻ nhớ lên hộp cao hơn, hẹn ôn sau 1, 3, 7, 16 ngày. <strong>Học thuộc</strong>: game nối từ, chọn từ, nghe và gõ lại, đọc định nghĩa tiếng Anh đoán từ — thuộc rồi thì từ được hẹn ôn sau 3 ngày.
        </p>
      </header>
      <EnStudy cards={cards} words={enGameWords()} lessons={lessons.filter((l) => cards.some((c) => c.lesson === l.number)).map((l) => ({ number: l.number, title: l.title_vi }))} />
    </div>
  );
}
