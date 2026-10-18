import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLevels, getWord, lessonsOfLevel } from "@/content/load";
import { Study4Hint } from "@/features/site/Study4Hint";
import { LessonProgress, LevelProgress } from "@/features/progress/ProgressWidgets";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLevels().map((level) => ({ level }));
}

export async function generateMetadata({ params }: { params: Promise<{ level: string }> }): Promise<Metadata> {
  return { title: `Lộ trình HSK${(await params).level}` };
}

export default async function HskLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!getLevels().includes(level)) notFound();
  const lessons = lessonsOfLevel(level);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-700">Lộ trình</p>
        <h1 className="text-3xl font-bold text-stone-900">HSK {level}</h1>
        <p className="mt-1 text-stone-500">{lessons.length} bài học theo chủ đề. Học từ vựng, xem câu ví dụ, rồi tổng kết từng bài.</p>
        {level === "3" && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
            HSK3 ở đây theo <strong>Đề cương HSK 2025</strong> (dùng cho kỳ thi HSK mới từ 12/2026): gồm những từ cấp 1–3 của đề thi mà
            bài HSK1–2 chưa dạy, cùng ngữ pháp cấp 3. Từ có trong đề thi được đánh dấu <strong>⭐ Đề thi</strong> ở mọi cấp.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <LevelProgress lessons={lessons} level={level} />
      </div>

      <Study4Hint group={`HSK ${level}`} />

      {level === "1" && <Link
        href="/zh/pinyin"
        className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 font-bold text-white">0</span>
        <span className="min-w-0">
          <span className="block font-semibold text-stone-900">Nhập môn phát âm · Pinyin</span>
          <span className="block text-sm text-stone-600">Mới bắt đầu? Học cách đọc pinyin, 4 thanh điệu, thanh mẫu, vận mẫu và nét chữ cơ bản trước Bài 1.</span>
        </span>
        <span className="ml-auto hidden text-sm font-medium text-brand-700 sm:inline">Bắt đầu →</span>
      </Link>}

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {lessons.map((lesson) => {
          const preview = lesson.words.slice(0, 6).map((w) => getWord(w)?.simplified).filter(Boolean);
          return (
            <li key={lesson.slug}>
              <Link
                href={`/zh/lesson/${lesson.slug}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700">{lesson.number}</span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-stone-900">{lesson.title}</h2>
                    <p className="text-sm text-stone-500">
                      {lesson.words.length} từ · {lesson.sentences.length} câu
                    </p>
                  </div>
                </div>
                <p lang="zh-CN" className="font-han truncate text-lg text-stone-700">{preview.join(" · ")}</p>
                <div className="mt-auto">
                  <LessonProgress slug={lesson.slug} words={lesson.words} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
