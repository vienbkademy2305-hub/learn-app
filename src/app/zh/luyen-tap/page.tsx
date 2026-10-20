import type { Metadata } from "next";
import { getLessons } from "@/content/load";
import { lessonLabel } from "@/content/lesson-label";
import { PracticeHub } from "@/features/practice/PracticeHub";

export const metadata: Metadata = { title: "Luyện tập tiếng Trung" };

export default function ChinesePracticeHubPage() {
  const lessons = getLessons().map((l) => ({ slug: l.slug, label: lessonLabel(l), title: l.title, words: l.words }));
  return (
    <PracticeHub
      lang="zh"
      lessons={lessons}
      tools={[
        { href: "/zh/listening", icon: "🎧", title: "Luyện nghe", hint: "Nghe và chọn đáp án" },
        { href: "/zh/practice", icon: "✏️", title: "Tất cả bài tập", hint: "Nghe, viết câu, viết chữ theo từng bài" },
        { href: "/zh/flashcards", icon: "🃏", title: "Sổ từ & học thuộc", hint: "Flashcard và game nối từ" },
        { href: "/zh/hoi-thoai-ai", icon: "💬", title: "Hội thoại AI", hint: "Trò chuyện theo tình huống" },
        { href: "/zh/kiem-tra", icon: "📝", title: "Đề luyện thi", hint: "Đề HSK theo cấp" },
        { href: "/zh/pinyin", icon: "🔤", title: "Pinyin & thanh điệu", hint: "Nhập môn phát âm" },
      ]}
    />
  );
}
