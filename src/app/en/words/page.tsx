import type { Metadata } from "next";
import { enContent } from "@/content/en";
import { WordIndex } from "@/features/en/WordIndex";

export const metadata: Metadata = { title: "Kho từ vựng" };

/** All English words of the published lessons, searchable, grouped by lesson. */
export default function EnWordsPage() {
  const { words, lessons } = enContent();
  const items = Object.values(words)
    .filter((w) => w.lesson !== null)
    .map((w) => ({ slug: w.slug, headword: w.headword, pos: w.pos, ipa: w.ipa?.uk ?? w.ipa?.us ?? null, meaning: w.meaning_vi.join("; "), lesson: w.lesson! }))
    .sort((a, b) => a.lesson - b.lesson || a.headword.localeCompare(b.headword));
  const titles = Object.fromEntries(lessons.map((l) => [l.number, l.title_vi]));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Kho từ vựng tiếng Anh</h1>
        <p className="mt-1 text-stone-500">{items.length} từ và cụm từ trong {lessons.length} buổi. Gõ tiếng Anh hoặc tiếng Việt (có dấu hay không dấu đều được).</p>
      </header>
      <WordIndex items={items} titles={titles} />
    </div>
  );
}
