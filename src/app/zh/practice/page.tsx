import type { Metadata } from "next";
import Link from "next/link";
import { getLessons } from "@/content/load";
import { EXERCISE_TYPES } from "@/features/exercises/data";
import { ExerciseScoreRow } from "@/features/exercises/ExerciseScores";

export const metadata: Metadata = { title: "Bài tập" };

/** All exercises of HSK1: every lesson × listening / writing / character writing. */
export default function PracticePage() {
  const lessons = getLessons();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Bài tập</h1>
        <p className="mt-1 text-stone-500">
          Mỗi bài học có 3 loại bài tập: <strong>bài nghe</strong>, <strong>bài viết</strong> và <strong>viết chữ</strong>. Câu hỏi đổi mới mỗi lần làm; điểm cao nhất được lưu trên trình duyệt này.
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {lessons.map((l) => (
          <li key={l.slug} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <Link href={`/zh/lesson/${l.slug}/exercises`} className="mb-3 flex items-center gap-3 hover:text-brand-700">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 font-bold text-brand-700">{l.number}</span>
              <span className="font-semibold">{l.title}</span>
            </Link>
            <ExerciseScoreRow lessonSlug={l.slug} items={EXERCISE_TYPES} />
          </li>
        ))}
      </ol>
    </div>
  );
}
