"use client";
import Link from "next/link";
import { exerciseKey, listeningSummary } from "@/domain/progress";
import { ProgressBar } from "@/features/progress/ProgressWidgets";
import { useProgress } from "@/features/progress/store";

interface LessonRow {
  slug: string;
  number: number;
  title: string;
  sentences: string[];
}

/** HSK1 listening progress: sentences listened, answer accuracy and best "Bài nghe" score per lesson. */
export function ListeningOverview({ lessons }: { lessons: LessonRow[] }) {
  const [state, , hydrated] = useProgress();
  const all = listeningSummary(state, lessons.flatMap((l) => l.sentences));
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

  return (
    <div className={`space-y-4 transition-opacity ${hydrated ? "opacity-100" : "opacity-0"}`}>
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-sm text-stone-500">Câu đã nghe</p>
          <p className="text-2xl font-bold text-stone-900">
            {all.listened}
            <span className="text-base font-medium text-stone-400">/{all.total}</span>
          </p>
        </div>
        <div>
          <p className="text-sm text-stone-500">Câu hỏi nghe đã trả lời</p>
          <p className="text-2xl font-bold text-stone-900">{all.attempts}</p>
        </div>
        <div>
          <p className="text-sm text-stone-500">Tỉ lệ trả lời đúng</p>
          <p className="text-2xl font-bold text-stone-900">{all.attempts ? `${pct(all.correct, all.attempts)}%` : "—"}</p>
        </div>
        <div className="sm:col-span-3">
          <ProgressBar percent={pct(all.listened, all.total)} label="Tiến độ luyện nghe HSK1" />
        </div>
      </div>

      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {lessons.map((l) => {
          const s = listeningSummary(state, l.sentences);
          const best = state.exercises?.[exerciseKey(l.slug, "listening")];
          return (
            <li key={l.slug} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 font-bold text-brand-700">{l.number}</span>
                <span className="font-semibold text-stone-900">{l.title}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm text-stone-600">
                <span>
                  Đã nghe <strong className="text-stone-900">{s.listened}</strong>/{s.total} câu
                </span>
                <span>Đúng: {s.attempts ? `${s.correct}/${s.attempts}` : "—"}</span>
                <span>Bài nghe: {best ? `${best.best}/${best.total}` : "chưa làm"}</span>
              </div>
              <ProgressBar percent={pct(s.listened, s.total)} label={`Tiến độ nghe bài ${l.number}`} />
              <div className="flex flex-wrap gap-2 text-sm">
                <Link href={`/zh/lesson/${l.slug}/examples`} className="rounded-lg px-3 py-1.5 font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
                  🎧 Luyện nghe
                </Link>
                <Link href={`/zh/lesson/${l.slug}/exercises/listening`} className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">
                  Làm bài nghe
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
