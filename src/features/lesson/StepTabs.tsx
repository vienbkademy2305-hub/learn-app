"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { key: "vocabulary", label: "1. Từ vựng", path: "" },
  { key: "grammar", label: "2. Ngữ pháp", path: "/grammar" },
  { key: "examples", label: "3. Câu ví dụ", path: "/examples" },
  { key: "writing", label: "4. Luyện viết", path: "/writing" },
  { key: "practice", label: "5. Luyện tập", path: "/practice" },
  { key: "exercises", label: "6. Bài tập", path: "/exercises" },
  { key: "summary", label: "7. Tổng kết", path: "/summary" },
] as const;

export function StepTabs({ slug }: { slug: string }) {
  const pathname = (usePathname() ?? "").replace(/\/$/, "");
  const base = `/lesson/${slug}`;
  const active =
    (["practice", "exercises"] as const).find((s) => pathname.includes(`${base}/${s}`)) ??
    (["grammar", "examples", "writing", "summary"] as const).find((s) => pathname.endsWith(`/${s}`)) ??
    "vocabulary";

  return (
    <nav aria-label="Các bước của bài học" className="-mx-4 overflow-x-auto px-4">
      <ol className="flex min-w-max gap-2">
        {STEPS.map((s) => (
          <li key={s.key}>
            <Link
              href={`${base}${s.path}`}
              aria-current={active === s.key ? "step" : undefined}
              className={`block rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                active === s.key ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-100"
              }`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
