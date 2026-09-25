"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Badge } from "@/components/Badge";
import {
  learnedCount,
  lessonPercent,
  lessonStatus,
  markLessonStarted,
  setLearned,
  setLessonCompleted,
  type LessonStatus,
} from "@/domain/progress";
import { useProgress } from "./store";

const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang học",
  completed: "Hoàn thành",
};

export function StatusBadge({ status }: { status: LessonStatus }) {
  return <Badge tone={status === "completed" ? "jade" : status === "in_progress" ? "amber" : "neutral"}>{STATUS_LABEL[status]}</Badge>;
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-jade-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Status + learned count + bar for one lesson. */
export function LessonProgress({ slug, words, showBar = true }: { slug: string; words: string[]; showBar?: boolean }) {
  const [state, , hydrated] = useProgress();
  const status = lessonStatus(state, slug, words);
  const percent = lessonPercent(state, words);
  return (
    <div className={`space-y-2 transition-opacity ${hydrated ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <StatusBadge status={status} />
        <span className="text-stone-500">
          {learnedCount(state, words)}/{words.length} từ đã học
        </span>
      </div>
      {showBar && <ProgressBar percent={percent} label="Tiến độ bài học" />}
    </div>
  );
}

/** Overall HSK progress across lessons. */
export function LevelProgress({ lessons }: { lessons: Array<{ slug: string; words: string[] }> }) {
  const [state, , hydrated] = useProgress();
  const allWords = [...new Set(lessons.flatMap((l) => l.words))];
  const done = lessons.filter((l) => lessonStatus(state, l.slug, l.words) === "completed").length;
  const percent = lessonPercent(state, allWords);
  return (
    <div className={`space-y-2 transition-opacity ${hydrated ? "opacity-100" : "opacity-0"}`}>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-stone-600">
        <span>
          <strong className="text-stone-900">{done}</strong>/{lessons.length} bài hoàn thành
        </span>
        <span>
          <strong className="text-stone-900">{learnedCount(state, allWords)}</strong>/{allWords.length} từ đã học
        </span>
      </div>
      <ProgressBar percent={percent} label="Tiến độ HSK1" />
    </div>
  );
}

/** Links to the first lesson that is not completed yet. */
export function ContinueLink({ lessons }: { lessons: Array<{ slug: string; number: number; title: string; words: string[] }> }) {
  const [state, , hydrated] = useProgress();
  const next = lessons.find((l) => lessonStatus(state, l.slug, l.words) !== "completed") ?? lessons[0];
  if (!next) return null;
  const started = hydrated && Object.keys(state.lessons).length + Object.keys(state.learned).length > 0;
  return (
    <Link href={`/lesson/${next.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-700">
      {started ? "Tiếp tục" : "Bắt đầu"}: Bài {next.number} · {next.title} →
    </Link>
  );
}

/** Marks the lesson as started when it is opened. Renders nothing. */
export function MarkLessonStarted({ slug }: { slug: string }) {
  const [, update] = useProgress();
  useEffect(() => update((s) => markLessonStarted(s, slug)), [slug, update]);
  return null;
}

export function LearnedToggle({ word, size = "md" }: { word: string; size?: "md" | "lg" }) {
  const [state, update, hydrated] = useProgress();
  const learned = Boolean(state.learned[word]);
  return (
    <button
      type="button"
      aria-pressed={learned}
      disabled={!hydrated}
      onClick={() => update((s) => setLearned(s, word, !learned))}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset transition-colors disabled:opacity-50 ${
        size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"
      } ${learned ? "bg-jade-600 text-white ring-jade-600 hover:bg-jade-700" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
        {learned ? (
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
        ) : (
          <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
        )}
      </svg>
      {learned ? "Đã học" : "Đánh dấu đã học"}
    </button>
  );
}

/** Lesson summary: learned/unlearned words and the completion switch. */
export function LessonSummaryPanel({
  slug,
  words,
  next,
}: {
  slug: string;
  words: Array<{ slug: string; simplified: string; pinyin: string }>;
  next: { slug: string; number: number; title: string } | null;
}) {
  const [state, update, hydrated] = useProgress();
  const wordSlugs = words.map((w) => w.slug);
  const status = lessonStatus(state, slug, wordSlugs);
  const learned = words.filter((w) => state.learned[w.slug]);
  const remaining = words.filter((w) => !state.learned[w.slug]);
  const percent = lessonPercent(state, wordSlugs);

  return (
    <div className={`space-y-6 transition-opacity ${hydrated ? "opacity-100" : "opacity-0"}`}>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">Từ vựng đã học</p>
            <p className="text-3xl font-bold text-stone-900">
              {learned.length}
              <span className="text-lg font-medium text-stone-400">/{words.length}</span>
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-4">
          <ProgressBar percent={percent} label="Tiến độ bài học" />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {status === "completed" ? (
            <button type="button" onClick={() => update((s) => setLessonCompleted(s, slug, false))} className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
              Bỏ đánh dấu hoàn thành
            </button>
          ) : (
            <button type="button" onClick={() => update((s) => setLessonCompleted(s, slug, true))} className="rounded-xl bg-jade-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-jade-700">
              Hoàn thành bài học
            </button>
          )}
          {next && (
            <Link href={`/lesson/${next.slug}`} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
              Bài tiếp theo: {next.title} →
            </Link>
          )}
        </div>
        {status !== "completed" && remaining.length > 0 && (
          <p className="mt-3 text-sm text-stone-500">Bạn vẫn có thể hoàn thành bài học khi còn từ chưa đánh dấu, và quay lại ôn sau.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-stone-900">Từ cần ôn thêm ({remaining.length})</h2>
        {remaining.length === 0 ? (
          <p className="text-sm text-jade-700">Tuyệt vời! Bạn đã đánh dấu tất cả từ trong bài.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {remaining.map((w) => (
              <li key={w.slug}>
                <Link href={`/lesson/${slug}/word/${w.slug}`} className="inline-flex items-baseline gap-1.5 rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-200 hover:ring-brand-300">
                  <span lang="zh-CN" className="font-han text-lg">{w.simplified}</span>
                  <span className="text-xs text-stone-500">{w.pinyin}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
