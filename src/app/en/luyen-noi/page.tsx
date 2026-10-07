import type { Metadata } from "next";
import { enContent, enSentence, enStep } from "@/content/en";
import { SpeakingLab, type LabSentence } from "@/features/en/SpeakingLab";

export const metadata: Metadata = { title: "Luyện nói — chấm phát âm" };

/** Read any lesson sentence (or your own) aloud and get it scored by OpenPronounce (docs/OPENPRONOUNCE_PLAN.md). */
export default function EnSpeakingLabPage() {
  const sentences: LabSentence[] = [];
  for (const l of enContent().lessons)
    for (const id of enStep(l, "examples")?.items ?? []) {
      const s = enSentence(id);
      if (s) sentences.push({ lesson: l.number, text: s.text, vi: s.vi });
    }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">🎤 Luyện nói — chấm phát âm</h1>
        <p className="mt-1 text-stone-600">
          Đọc to một câu, máy chấm cho điểm 0–100 và chỉ ra từ nào đọc sai, sai ở âm nào. Bạn cũng có thể bấm <strong>🎤 Chấm</strong> cạnh mọi câu ví dụ trong bài học.
        </p>
      </header>
      <SpeakingLab sentences={sentences} />
    </div>
  );
}
