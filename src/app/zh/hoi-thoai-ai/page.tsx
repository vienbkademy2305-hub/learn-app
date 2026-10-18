import type { Metadata } from "next";
import { ZhAiChat } from "@/features/chat/ZhAiChat";
import { allGameWords } from "@/features/practice/data";

export const metadata: Metadata = { title: "Hội thoại với AI" };

export default function ChineseAiChatPage() {
  // Slim copy of the vocabulary for "Săn từ" (the page ships it to the browser).
  const words = allGameWords().map((w) => ({ id: w.id, term: w.term, reading: null, meaning: w.meaning.slice(0, 40), definitionEn: null, lesson: w.lesson }));
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Hội thoại với AI</h1>
        <p className="mt-1 text-stone-600">Nói chuyện tự do bằng tiếng Trung với AI nhập vai — gõ hoặc nói, AI đáp lại, có pinyin và sửa lỗi sau mỗi câu. Bật “Săn từ” để luyện dùng đúng những từ bạn hay quên.</p>
      </div>
      <ZhAiChat words={words} />
    </div>
  );
}
