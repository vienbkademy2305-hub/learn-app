import type { Metadata } from "next";
import { enTestCards } from "@/content/en-tests";
import { TestList } from "@/features/en/TestRunner";

export const metadata: Metadata = { title: "Kiểm tra" };

/** Mini tests after every 5 lessons and the exit test of each stage. */
export default function EnTestsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Kiểm tra</h1>
        <p className="mt-1 text-stone-500">
          Kiểm tra ngắn sau mỗi 5 buổi để phát hiện chỗ hổng sớm, và bài kiểm tra đầu ra cuối giai đoạn. Đạt từ 80% là sẵn sàng đi tiếp; chưa đạt thì
          kết quả sẽ chỉ ra buổi cần ôn lại.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Giai đoạn 1 · Buổi 1–20</h2>
        <TestList tests={enTestCards(1)} />
      </section>
    </div>
  );
}
