import Link from "next/link";
import catalog from "@/content/study4-catalog.json";

type Item = { id: number; title: string; url: string; group: string };
const ITEMS = catalog.items as Item[];

/** Gợi ý vài đề Study4 cùng nhóm (chỉ liên kết, không chép đề). `seed` làm các buổi khác nhau gợi ý đề khác nhau. */
export function Study4Hint({ group, seed = 0, count = 3 }: { group: string; seed?: number; count?: number }) {
  const pool = ITEMS.filter((i) => i.group === group);
  if (pool.length === 0) return null;
  const picks = Array.from({ length: Math.min(count, pool.length) }, (_, k) => pool[(seed * count + k) % pool.length]!);
  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-900">Luyện thêm trên Study4 · {group}</h2>
      <ul className="mt-2 space-y-1">
        {picks.map((p) => (
          <li key={p.id}>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-lg px-2 text-sm text-stone-800 active:bg-stone-100">
              {p.title} <span aria-hidden className="text-stone-400">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <Link href={`/de-them#${encodeURIComponent(group)}`} className="mt-1 inline-block px-2 text-sm font-medium text-brand-700">
        Xem cả {pool.length} đề →
      </Link>
    </aside>
  );
}
