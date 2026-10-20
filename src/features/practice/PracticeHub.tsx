"use client";
/**
 * "Luyện tập" hub (docs/UI_POLISH_PLAN.md, after the "Mài dũa kỹ năng" screen): a gradient header with two big cards —
 * the next practice lesson and the words due for review — then the learner's collection, today's study and the other
 * practice modes. One component for both languages; the pages pass plain data.
 */
import Link from "next/link";
import { dateKey, xpOn } from "@/domain/activity";
import { dueReviewed, nextOf } from "@/domain/hub";
import { lessonStatus } from "@/domain/progress";
import { useActivity } from "@/features/activity/store";
import { useEnProgress } from "@/features/en/progress";
import { useProgress } from "@/features/progress/store";

export interface HubLesson {
  slug: string;
  /** "Buổi 5" / "Bài 3" */
  label: string;
  title: string;
  words?: string[];
  exercises?: string[];
}

export interface HubTool {
  href: string;
  icon: string;
  title: string;
  hint: string;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="absolute -right-1 -top-2 grid min-w-7 place-items-center rounded-full bg-red-500 px-1.5 py-0.5 text-sm font-bold text-white shadow">{n > 99 ? "99+" : n}</span>;
}

export function PracticeHub({ lang, lessons, tools }: { lang: "en" | "zh"; lessons: HubLesson[]; tools: HubTool[] }) {
  const [zh, , zhHydrated] = useProgress();
  const [en, , enHydrated] = useEnProgress();
  const [activity, , actHydrated] = useActivity();
  const hydrated = lang === "en" ? enHydrated : zhHydrated;

  const isDone = (l: HubLesson) =>
    lang === "en" ? (l.exercises?.length ?? 0) > 0 && (l.exercises ?? []).every((id) => en.exercises[id]) : lessonStatus(zh, l.slug, l.words ?? []) === "completed";
  const next = hydrated ? nextOf(lessons, isDone) : lessons[0];
  const due = hydrated ? dueReviewed(lang === "en" ? en.cards : zh.cards) : 0;
  const learned = hydrated ? (lang === "en" ? Object.keys(en.mastery).length : Object.keys(zh.learned).length) : 0;
  const doneLessons = hydrated ? lessons.filter(isDone).length : 0;
  const today = actHydrated ? xpOn(activity, dateKey()) : 0;
  const base = lang === "en" ? "/en" : "/zh";

  const card = "relative block overflow-hidden rounded-3xl p-5 shadow-lg transition active:scale-[.98]";
  return (
    <div className="-mx-4 -mt-6 space-y-6 sm:mx-0 sm:mt-0">
      <section className="rounded-b-[2.5rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-500 px-5 pb-6 pt-8 text-white sm:rounded-3xl">
        <h1 className="text-4xl font-extrabold leading-tight">Mài dũa kỹ năng</h1>
        <div className="mt-5 space-y-3">
          {next && (
            <Link href={`${base}/lesson/${next.slug}/exercises`} className={`${card} bg-gradient-to-r from-pink-400 via-fuchsia-500 to-sky-400`}>
              <p className="text-xl font-bold">Bài học thực hành</p>
              <p className="mt-2 inline-block max-w-[75%] truncate rounded-lg bg-white px-3 py-1 text-lg font-bold text-fuchsia-600">{next.label} · {next.title}</p>
              <span aria-hidden className="absolute right-5 top-1/2 -translate-y-1/2 text-6xl opacity-90">✨</span>
            </Link>
          )}
          <Link href={`${base}/flashcards`} className={`${card} bg-neutral-800`}>
            <Badge n={due} />
            <p className="text-xl font-bold">Ôn lại các từ</p>
            <p className="mt-2 inline-block rounded-lg bg-violet-500 px-3 py-1 text-lg font-bold">{due > 0 ? `${due} từ đến hạn ôn` : "Học thuộc bằng game"}</p>
            <span aria-hidden className="absolute right-5 top-1/2 -translate-y-1/2 text-6xl">🏋️</span>
          </Link>
        </div>
      </section>

      <div className="space-y-6 px-4 sm:px-0">
        <section>
          <h2 className="text-2xl font-extrabold text-stone-900">Bộ sưu tập của bạn</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-neutral-900 p-5 text-white">
              <p className="text-4xl font-extrabold">{learned}</p>
              <p className="text-neutral-400">từ đã học</p>
            </div>
            <div className="rounded-3xl bg-neutral-900 p-5 text-white">
              <p className="text-4xl font-extrabold">{doneLessons}</p>
              <p className="text-neutral-400">{lang === "en" ? "buổi đã làm bài tập" : "bài đã hoàn thành"}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-stone-900">Hôm nay</h2>
            <Link href="/hom-nay" className="flex items-center gap-2 text-lg font-bold text-amber-600">
              <span aria-hidden>🔥</span> {today} XP
            </Link>
          </div>
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {[
              { n: today, label: "XP hôm nay" },
              { n: due, label: "Từ cần ôn" },
              { n: doneLessons, label: "Bài đã xong" },
            ].map((t) => (
              <div key={t.label} className="grid h-36 w-40 shrink-0 place-items-center rounded-3xl bg-neutral-900 text-center text-white">
                <div>
                  <p className="text-4xl font-extrabold text-violet-300">{t.n}</p>
                  <p className="mt-1 text-neutral-400">{t.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold text-stone-900">Luyện thêm</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {tools.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center gap-4 rounded-2xl bg-neutral-900 p-4 text-white transition hover:bg-neutral-800 active:scale-[.98]">
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-neutral-800 text-2xl">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-lg font-bold">{t.title}</span>
                    <span className="block text-sm text-neutral-400">{t.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
