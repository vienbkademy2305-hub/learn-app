import type { Metadata } from "next";
import { enTestCards, enTests } from "@/content/en-tests";
import { TestList } from "@/features/en/TestRunner";

export const metadata: Metadata = { title: "Kiểm tra" };

/** Mini tests after every 5 lessons and the exit test of each stage. */
export default function EnTestsPage() {
  const stages = [...new Set(enTests().map((t) => t.stage))].sort((a, b) => a - b);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Kiểm tra</h1>
        <p className="mt-1 text-stone-500">
          Kiểm tra ngắn sau mỗi 5 buổi để phát hiện chỗ hổng sớm, và bài kiểm tra đầu ra cuối giai đoạn. Đạt từ 80% là sẵn sàng đi tiếp; chưa đạt thì
          kết quả sẽ chỉ ra buổi cần ôn lại.
        </p>
      </header>
      {stages.map((stage) => {
        const tests = enTestCards(stage);
        const from = Math.min(...enTests().filter((t) => t.stage === stage).map((t) => t.after_lesson - 4));
        const to = Math.max(...tests.map((t) => t.after));
        return (
          <section key={stage} className="space-y-3">
            <h2 className="text-lg font-semibold text-stone-900">
              Giai đoạn {stage} · Buổi {from}–{to}
            </h2>
            <TestList tests={tests} />
          </section>
        );
      })}
    </div>
  );
}
