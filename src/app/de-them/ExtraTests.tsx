"use client";

import { useEffect, useMemo, useState } from "react";
import catalog from "@/content/study4-catalog.json";

type Item = { id: number; title: string; url: string; group: string; lang: string };
const ITEMS = catalog.items as Item[];

/** Thứ tự nhóm hiển thị (chỉ nhóm có đề). */
const ORDER = ["HSK 1", "HSK 2", "HSK 3", "IELTS Listening", "IELTS Academic Reading", "IELTS General Reading", "IELTS Writing", "IELTS Speaking"];

export function ExtraTests({ initialGroup }: { initialGroup?: string }) {
  const groups = ORDER.filter((g) => ITEMS.some((i) => i.group === g));
  const [group, setGroup] = useState(initialGroup && groups.includes(initialGroup) ? initialGroup : groups[0]);
  const [q, setQ] = useState("");
  // Liên kết từ bài học: /de-them#HSK%203 mở sẵn đúng nhóm.
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (groups.includes(h)) setGroup(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = useMemo(
    () => ITEMS.filter((i) => i.group === group && i.title.toLowerCase().includes(q.trim().toLowerCase())),
    [group, q],
  );

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {groups.map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={g === group}
            onClick={() => setGroup(g)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              g === group ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            {g} <span className="opacity-70">({ITEMS.filter((i) => i.group === g).length})</span>
          </button>
        ))}
      </div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm đề, ví dụ: test 5"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base"
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((i) => (
          <li key={i.id}>
            <a
              href={i.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 active:bg-stone-50"
            >
              <span className="text-sm font-medium text-stone-900">{i.title}</span>
              <span aria-hidden className="text-stone-400">↗</span>
            </a>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="text-sm text-stone-500">Không có đề khớp.</p>}
    </div>
  );
}
