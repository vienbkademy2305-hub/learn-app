"use client";
/** Story shelf: covers grouped by level (A2 / B1 / B2) with the learner's stars, like "Số vụ đã giải 0/6". */
import Link from "next/link";
import { useEffect } from "react";
import { starsEarned, type StoryLang, type StoryLevel } from "@/domain/story";
import { startStoriesSync } from "./sync";
import { useStories } from "./store";

export interface StoryCard {
  id: string;
  level: StoryLevel;
  cover: string;
  title_vi: string;
  witnesses: number;
}

const LEVELS: Record<StoryLang, Array<{ level: StoryLevel; title: string; tone: string }>> = {
  en: [
    { level: "A2", title: "Dành cho lính mới", tone: "bg-emerald-500" },
    { level: "B1", title: "Thử thách hơn nữa", tone: "bg-sky-500" },
    { level: "B2", title: "Thám tử chuyên nghiệp", tone: "bg-violet-500" },
  ],
  zh: [
    { level: "HSK1", title: "Dành cho lính mới", tone: "bg-emerald-500" },
    { level: "HSK2", title: "Thử thách hơn nữa", tone: "bg-sky-500" },
    { level: "HSK3", title: "Thám tử chuyên nghiệp", tone: "bg-violet-500" },
  ],
};

const GRADIENTS = ["from-rose-500 to-orange-400", "from-sky-500 to-indigo-500", "from-emerald-500 to-teal-400", "from-fuchsia-500 to-pink-400", "from-amber-500 to-yellow-400", "from-violet-500 to-blue-400"];

export function StoryList({ stories, lang }: { stories: StoryCard[]; lang: StoryLang }) {
  const [state, , hydrated] = useStories();
  useEffect(() => startStoriesSync(), []);
  return (
    <div className="-mx-4 -mt-6 space-y-8 bg-black pb-10 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl">
      <header className="rounded-b-[2.5rem] bg-gradient-to-br from-violet-600 to-indigo-700 px-5 pb-7 pt-8 sm:rounded-3xl">
        <h1 className="max-w-[16rem] text-3xl font-extrabold leading-tight">{lang === "zh" ? "Truyện trinh thám tiếng Trung" : "Những câu chuyện trinh thám"}</h1>
        <p className="mt-2 max-w-sm text-lg text-white/75">{lang === "zh" ? "Chọn vụ án, nghe lời khai bằng tiếng Trung (có pinyin) và tìm ra hung thủ." : "Chọn vụ án, nghe lời khai bằng tiếng Anh và tìm ra hung thủ."}</p>
      </header>
      {LEVELS[lang].map(({ level, title, tone }) => {
        const list = stories.filter((s) => s.level === level);
        const solved = hydrated ? list.filter((s) => state.stories[s.id]?.solved).length : 0;
        return (
          <section key={level} className="px-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">{title}</h2>
                <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">Số vụ đã giải {solved}/{Math.max(list.length, 6)}</p>
              </div>
              <span className={`rounded-lg px-3 py-1 text-lg font-extrabold ${tone}`}>{level}</span>
            </div>
            {list.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-neutral-900 p-4 text-neutral-400">Sắp có thêm vụ án ở cấp này.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {list.map((s, i) => {
                  const stars = hydrated ? starsEarned(state.stories[s.id]) : 0;
                  const max = 3 * s.witnesses + 1;
                  return (
                    <li key={s.id}>
                      <Link href={`/${lang}/truyen/${s.id}`} className={`relative grid aspect-square place-items-center rounded-3xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} text-5xl shadow-lg transition active:scale-95`}>
                        <span aria-hidden>{s.cover}</span>
                        <span className="absolute inset-x-3 bottom-3 h-3 overflow-hidden rounded-full bg-white/80">
                          <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(stars / max) * 100}%`, minWidth: stars ? "0.75rem" : 0 }} />
                        </span>
                        <span className="sr-only">{s.title_vi}</span>
                      </Link>
                      <p className="mt-2 text-sm font-bold leading-tight text-neutral-200">{s.title_vi}</p>
                      <p className="text-xs text-neutral-500">{stars}/{max} sao</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
