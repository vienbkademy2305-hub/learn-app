import type { Metadata } from "next";
import { AiChat } from "@/features/chat/AiChat";

export const metadata: Metadata = { title: "Hội thoại với AI" };

export default function EnglishAiChatPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Hội thoại với AI</h1>
        <p className="mt-1 text-stone-600">Nói chuyện tự do bằng tiếng Anh với AI nhập vai — gõ hoặc nói, AI đáp lại và sửa lỗi sau mỗi câu.</p>
      </div>
      <AiChat lang="en" />
    </div>
  );
}
