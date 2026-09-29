"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Say } from "./speech";

type Item = { slug: string; headword: string; pos: string; ipa: string | null; meaning: string; lesson: number };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

export function WordIndex({ items, titles }: { items: Item[]; titles: Record<number, string> }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const f = fold(q.trim());
    return f ? items.filter((w) => fold(`${w.headword} ${w.meaning}`).includes(f)) : items;
  }, [q, items]);
  const groups = [...new Set(shown.map((w) => w.lesson))];

  return (
    <div className="space-y-6">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm từ: weather, thời tiết, thoi tiet…"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none"
      />
      {groups.length === 0 && <p className="text-stone-500">Không tìm thấy từ nào.</p>}
      {groups.map((n) => (
        <section key={n}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Buổi {n} · {titles[n]}</h2>
          <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {shown.filter((w) => w.lesson === n).map((w) => (
              <li key={w.slug} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/en/word/${w.slug}`} className="min-w-0 flex-1 hover:text-sky-800">
                  <span lang="en" className="font-semibold">{w.headword}</span>
                  {w.ipa && <span className="ml-2 font-mono text-xs text-stone-500">{w.ipa}</span>}
                  <span className="block truncate text-sm text-stone-500">{w.meaning}</span>
                </Link>
                <Say text={w.headword} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
