"use client";
/** Thanh tab dưới cùng kiểu app (chỉ hiện trên điện thoại): ngón cái với tới được, đủ mục chính. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LAST_LANG_KEY, langOf, type Lang } from "./SiteChrome";

type Tab = { href: string; icon: string; label: string; match: RegExp };

const TABS: Record<Lang, Tab[]> = {
  zh: [
    { href: "/zh", icon: "📚", label: "HSK", match: /^\/zh(\/(hsk|lesson|word|pinyin)(\/.*)?)?$/ },
    { href: "/zh/practice", icon: "✏️", label: "Bài tập", match: /^\/zh\/practice/ },
    { href: "/zh/hoi-thoai-ai", icon: "💬", label: "AI", match: /^\/zh\/hoi-thoai-ai/ },
    { href: "/zh/flashcards", icon: "🃏", label: "Sổ từ", match: /^\/zh\/flashcards/ },
    { href: "/zh/listening", icon: "🎧", label: "Nghe", match: /^\/zh\/listening/ },
  ],
  en: [
    { href: "/en", icon: "🗺️", label: "Lộ trình", match: /^\/en(\/lesson(\/.*)?)?$/ },
    { href: "/en/hoi-thoai-ai", icon: "💬", label: "AI", match: /^\/en\/hoi-thoai-ai/ },
    { href: "/en/flashcards", icon: "🃏", label: "Ôn từ", match: /^\/en\/flashcards/ },
    { href: "/en/luyen-noi", icon: "🎤", label: "Nói", match: /^\/en\/luyen-noi/ },
    { href: "/en/words", icon: "📖", label: "Kho từ", match: /^\/en\/(words|word)/ },
  ],
};

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
  const lang = langOf(path) ?? (path.startsWith("/de-them") ? stored : null);
  if (!lang) return null;
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
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
                <span aria-hidden className="text-xl leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
