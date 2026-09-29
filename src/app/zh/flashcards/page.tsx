import type { Metadata } from "next";
import { allFlashWords } from "@/features/practice/data";
import { Notebook } from "@/features/practice/Notebook";

export const metadata: Metadata = { title: "Sổ từ" };

/** Word notebook: words saved from any lesson, reviewed as flashcards. */
export default function NotebookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Sổ từ</h1>
        <p className="mt-1 text-stone-500">Những từ bạn đã lưu khi học, ôn lại bằng flashcard. Sổ từ được lưu trên trình duyệt này.</p>
      </div>
      <Notebook words={allFlashWords()} />
    </div>
  );
}
