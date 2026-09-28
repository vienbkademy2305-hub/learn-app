import type { Metadata } from "next";
import { getLessons } from "@/content/load";
import { ListeningOverview } from "@/features/listening/ListeningOverview";

export const metadata: Metadata = { title: "Luyện nghe" };

/** Listening progress across HSK1 (docs/LISTENING_PLAN.md §2.3). */
export default function ListeningPage() {
  const lessons = getLessons().map((l) => ({ slug: l.slug, number: l.number, title: l.title, sentences: l.sentences }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Luyện nghe HSK1</h1>
        <p className="mt-1 text-stone-500">
          Nghe câu mẫu (giọng thu sẵn, tốc độ thường và chậm) ở bước <strong>Câu ví dụ & luyện nghe</strong> của mỗi bài, với 4 chế độ: xem đủ, ẩn chữ Hán, ẩn pinyin, ẩn nghĩa. Sau đó làm <strong>Bài nghe</strong> để kiểm tra. Tiến độ được lưu trên trình duyệt này.
        </p>
      </div>
      <ListeningOverview lessons={lessons} />
    </div>
  );
}
