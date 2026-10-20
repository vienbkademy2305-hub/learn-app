import type { Metadata } from "next";
import { enContent, enStep } from "@/content/en";
import { PracticeHub } from "@/features/practice/PracticeHub";

export const metadata: Metadata = { title: "Luyện tập tiếng Anh" };

export default function EnglishPracticeHubPage() {
  const lessons = enContent().lessons.map((l) => ({
    slug: l.slug,
    label: `Buổi ${l.number}`,
    title: l.title_vi,
    exercises: (enStep(l, "exercises")?.items ?? []).map((x) => x.id),
  }));
  return (
    <PracticeHub
      lang="en"
      lessons={lessons}
      tools={[
        { href: "/en/luyen-noi", icon: "🎤", title: "Luyện nói", hint: "Đọc to một câu, máy chấm phát âm" },
        { href: "/en/hoi-thoai-ai", icon: "💬", title: "Hội thoại AI", hint: "Trò chuyện theo tình huống" },
        { href: "/en/flashcards", icon: "🃏", title: "Ôn flashcard", hint: "Thẻ từ và game học thuộc" },
        { href: "/en/words", icon: "📖", title: "Kho từ vựng", hint: "Tra từ, IPA, ví dụ" },
        { href: "/en/kiem-tra", icon: "📝", title: "Kiểm tra", hint: "Bài kiểm tra từng giai đoạn" },
      ]}
    />
  );
}
