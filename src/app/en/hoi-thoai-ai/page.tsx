import type { Metadata } from "next";
import { enGameWords } from "@/content/en";
import { EnAiChat } from "@/features/chat/EnAiChat";

export const metadata: Metadata = { title: "Hội thoại với AI" };

export default function EnglishAiChatPage() {
  // Slim copy of the vocabulary for "Săn từ" (the page ships it to the browser).
  const words = enGameWords().map((w) => ({ id: w.id, term: w.term, reading: null, meaning: w.meaning.slice(0, 40), definitionEn: null, lesson: w.lesson }));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Hội thoại với AI</h1>
        <p className="mt-1 text-stone-600">Nói chuyện tự do bằng tiếng Anh với AI nhập vai — gõ hoặc nói, AI đáp lại và sửa lỗi sau mỗi câu. Bật “Săn từ” để luyện dùng đúng những từ bạn hay quên.</p>
      </div>
      <EnAiChat words={words} />
    </div>
  );
}
