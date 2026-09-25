import Link from "next/link";
import { content } from "@/content/load";
import { ContinueLink, LevelProgress } from "@/features/progress/ProgressWidgets";

export default function HomePage() {
  const { lessons, words, sentences } = content();
  const curriculumWords = Object.values(words).filter((w) => w.inCurriculum).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-10 text-white shadow-md sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-100">Tiếng Trung cho người Việt</p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Học HSK1 từng bước, giải thích bằng tiếng Việt</h1>
        <p className="mt-4 max-w-xl text-brand-50">
          Mỗi từ có chữ Hán, pinyin, âm Hán Việt, nghĩa tiếng Việt và câu ví dụ có audio thường và chậm.
        </p>
        <p lang="zh-CN" className="font-han mt-6 text-5xl tracking-widest text-white/90">你好！</p>
        <p className="mt-1 text-brand-100">nǐ hǎo · nhĩ hảo · Xin chào</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Lộ trình HSK1</h2>
            <p className="mt-1 text-sm text-stone-500">
              {lessons.length} bài · {curriculumWords} từ vựng · {Object.keys(sentences).length} câu ví dụ
            </p>
          </div>
          <Link href="/hsk/1" className="text-sm font-medium text-brand-700 hover:underline">
            Xem tất cả bài →
          </Link>
        </div>
        <div className="mt-5">
          <LevelProgress lessons={lessons} />
        </div>
        <div className="mt-6">
          <ContinueLink lessons={lessons} />
        </div>
      </section>

      <p className="text-xs text-stone-400">
        Tiến độ học được lưu trên trình duyệt này. Các bản dịch câu hiện là bản nháp, đang chờ biên tập.
      </p>
    </div>
  );
}
