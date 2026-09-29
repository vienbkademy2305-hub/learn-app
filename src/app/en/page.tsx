import Link from "next/link";
import { enContent, enLessonSteps, enStep } from "@/content/en";
import { enTestCards } from "@/content/en-tests";
import { EnSyncNote } from "@/features/en/EnSync";
import { TestList } from "@/features/en/TestRunner";
import { EnLessonList } from "@/features/en/LessonChrome";

export default function EnglishHomePage() {
  const { lessons, words, sentences } = enContent();
  const list = lessons.map((l) => ({
    slug: l.slug,
    number: l.number,
    title: l.title_vi,
    focus: l.focus?.grammar ?? "",
    steps: enLessonSteps(l).length,
    exercises: (enStep(l, "exercises")?.items ?? []).map((x) => x.id),
    draft: l.status === "draft",
  }));

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 to-sky-900 px-6 py-10 text-white shadow-md sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-sky-100">Tiếng Anh cho người Việt</p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Lộ trình IELTS 6.5 — Giai đoạn 1: Nền tảng</h1>
        <p className="mt-4 max-w-xl text-sky-50">
          Mỗi buổi: từ vựng theo chủ đề có IPA và giọng đọc, phát âm, một điểm ngữ pháp giải thích bằng tiếng Việt, câu ví dụ, hội thoại,
          bài tập chấm tự động và bài viết về nhà. Mục tiêu band 4.0 → 5.0.
        </p>
        <p lang="en" className="mt-6 text-3xl font-semibold tracking-tight text-white/90">Nice to meet you!</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Giai đoạn 1 · Buổi 1–20</h2>
            <p className="mt-1 text-sm text-stone-500">
              {lessons.length} buổi · {Object.keys(words).length} từ vựng · {Object.keys(sentences).length} câu ví dụ
            </p>
          </div>
          <Link href="/en/words" className="text-sm font-medium text-sky-800 hover:underline">
            Kho từ vựng →
          </Link>
        </div>
        <div className="mt-5">
          <EnLessonList lessons={list} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Kiểm tra</h2>
            <p className="mt-1 text-sm text-stone-500">Kiểm tra ngắn sau mỗi 5 buổi và bài đầu ra cuối giai đoạn — đạt từ 80% để đi tiếp.</p>
          </div>
          <Link href="/en/kiem-tra" className="text-sm font-medium text-sky-800 hover:underline">Tất cả bài kiểm tra →</Link>
        </div>
        <div className="mt-5">
          <TestList tests={enTestCards(1)} />
        </div>
      </section>

      <p className="text-xs text-stone-400">
        Nội dung là <strong>bản nháp</strong> do Claude biên soạn, đang chờ duyệt. Cấp CEFR theo danh sách Oxford 3000/5000; phần lớn IPA đã đối chiếu Oxford Learner’s và Wiktionary. <EnSyncNote />
      </p>
    </div>
  );
}
