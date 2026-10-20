"use client";
/** Thanh tab dưới cùng kiểu app (chỉ hiện trên điện thoại): ngón cái với tới được, đủ mục chính. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dueReviewed } from "@/domain/hub";
import { useEnProgress } from "@/features/en/progress";
import { useProgress } from "@/features/progress/store";
import { LAST_LANG_KEY, langOf, type Lang } from "./SiteChrome";

type Tab = { href: string; icon: string; label: string; match: RegExp };

const TABS: Record<Lang, Tab[]> = {
  zh: [
    { href: "/zh", icon: "🗺️", label: "Học", match: /^\/zh(\/(hsk|lesson|word|pinyin)(\/.*)?)?$/ },
    { href: "/zh/luyen-tap", icon: "💪", label: "Luyện", match: /^\/zh\/(luyen-tap|practice|flashcards|listening|kiem-tra)/ },
    { href: "/zh/hoi-thoai-ai", icon: "💬", label: "AI", match: /^\/zh\/hoi-thoai-ai/ },
    { href: "/hom-nay", icon: "🔥", label: "Hôm nay", match: /^\/hom-nay/ },
  ],
  en: [
    { href: "/en", icon: "🗺️", label: "Học", match: /^\/en(\/lesson(\/.*)?)?$/ },
    { href: "/en/luyen-tap", icon: "💪", label: "Luyện", match: /^\/en\/(luyen-tap|flashcards|luyen-noi|words|word|kiem-tra)/ },
    { href: "/en/truyen", icon: "🕵️", label: "Truyện", match: /^\/en\/truyen/ },
    { href: "/hom-nay", icon: "🔥", label: "Hôm nay", match: /^\/hom-nay/ },
  ],
};

/** Red dot on "Luyện" while words are waiting for review. */
function useDue(lang: Lang): boolean {
  const [zh, , zhH] = useProgress();
  const [en, , enH] = useEnProgress();
  return lang === "en" ? enH && dueReviewed(en.cards) > 0 : zhH && dueReviewed(zh.cards) > 0;
}

export function BottomNav() {
  const path = usePathname() ?? "";
  const [stored, setStored] = useState<Lang | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(LAST_LANG_KEY);
      if (v === "zh" || v === "en") setStored(v);
    } catch {
      // storage blocked: no tab bar outside /zh and /en
    }
  }, []);
  // Trang chung (/de-them) dùng bộ tab của ngôn ngữ học gần nhất.
  const lang = langOf(path) ?? (path.startsWith("/de-them") || path.startsWith("/hom-nay") ? stored : null);
  return lang ? <Bar lang={lang} path={path} /> : null;
}

function Bar({ lang, path }: { lang: Lang; path: string }) {
  const due = useDue(lang);
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${TABS[lang].length}, minmax(0, 1fr))` }}>
        {TABS[lang].map((t) => {
          const active = t.match.test(path.replace(/\/$/, "") || "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active ? (lang === "zh" ? "text-brand-600" : "text-sky-700") : "text-stone-500"
                }`}
              >
                <span aria-hidden className="relative text-xl leading-none">
                  {t.icon}
                  {due && t.href.endsWith("/luyen-tap") && <span className="absolute -right-1.5 -top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
