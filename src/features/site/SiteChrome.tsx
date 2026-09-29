"use client";
/**
 * Header and footer shared by both languages (docs/ENGLISH_SPLIT_PLAN.md, E1). The URL decides which
 * menu to show: /zh/… Chinese, /en/… English, anything else (chooser, login, account) a neutral one.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AccountMenu } from "@/features/account/AccountMenu";

export type Lang = "zh" | "en";
export const LAST_LANG_KEY = "learn-app:last-lang";

export function langOf(pathname: string | null): Lang | null {
  if (!pathname) return null;
  if (pathname === "/zh" || pathname.startsWith("/zh/")) return "zh";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return null;
}

const NAV: Record<Lang, Array<{ href: string; short: string; long: string; desktopOnly?: boolean }>> = {
  zh: [
    { href: "/zh/hsk/1", short: "HSK1", long: "Lộ trình HSK1" },
    { href: "/zh/practice", short: "Bài tập", long: "Bài tập" },
    { href: "/zh/listening", short: "Nghe", long: "Luyện nghe" },
    { href: "/zh/flashcards", short: "Sổ từ", long: "Sổ từ" },
    { href: "/sources", short: "Nguồn", long: "Nguồn dữ liệu", desktopOnly: true },
  ],
  en: [
    { href: "/en", short: "Lộ trình", long: "Lộ trình IELTS" },
    { href: "/en/words", short: "Kho từ", long: "Kho từ vựng" },
    { href: "/en/flashcards", short: "Ôn từ", long: "Ôn flashcard" },
  ],
};

const BRAND: Record<Lang | "all", { mark: string; title: string; home: string; tile: string }> = {
  zh: { mark: "学", title: "Học tiếng Trung", home: "/zh", tile: "font-han bg-brand-600" },
  en: { mark: "En", title: "Học tiếng Anh", home: "/en", tile: "bg-sky-700" },
  all: { mark: "Aa", title: "Học ngoại ngữ", home: "/", tile: "bg-stone-800" },
};

export function SiteHeader() {
  const lang = langOf(usePathname());
  const brand = BRAND[lang ?? "all"];
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href={brand.home} className="flex items-center gap-2 font-semibold text-stone-900">
          <span className={`grid size-8 place-items-center rounded-lg text-lg text-white ${brand.tile}`}>{brand.mark}</span>
          <span className="hidden sm:inline">{brand.title}</span>
        </Link>
        <nav className="ml-auto flex items-center gap-0.5 text-sm sm:gap-1">
          {lang &&
            NAV[lang].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${item.desktopOnly ? "hidden sm:inline" : ""} rounded-md px-2 py-2 font-medium whitespace-nowrap text-stone-700 hover:bg-stone-100 sm:px-3`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.long}</span>
              </Link>
            ))}
          <Link
            href={lang === "zh" ? "/en" : lang === "en" ? "/zh" : "/"}
            title="Đổi ngôn ngữ học"
            className={`${lang ? "" : "hidden"} rounded-md px-2 py-2 text-xs font-semibold whitespace-nowrap text-stone-500 ring-1 ring-inset ring-stone-200 hover:bg-stone-100`}
          >
            {lang === "zh" ? "→ Anh" : "→ Trung"}
          </Link>
          <AccountMenu />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const lang = langOf(usePathname());
  return (
    <footer className="mx-auto max-w-5xl px-4 pb-24 text-xs text-stone-400 sm:pb-8">
      {lang === "zh" && <>Dữ liệu mở: CVDICT, CC-CEDICT, hsk-sentences-audio (CC BY-SA 4.0), Unihan, Hanzi Writer. </>}
      {lang === "en" && <>Nội dung tiếng Anh tự biên soạn (bản nháp, CC BY-SA 4.0); âm thanh bằng giọng đọc của trình duyệt. </>}
      <Link href="/sources" className="font-medium text-stone-500 underline-offset-2 hover:underline">
        Nguồn dữ liệu & giấy phép
      </Link>
    </footer>
  );
}

/** Remembers the language being studied so the chooser can offer "Tiếp tục học …". */
export function RememberLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_LANG_KEY, lang);
    } catch {
      // storage blocked: the chooser just shows both options
    }
  }, [lang]);
  return null;
}

const LEGACY = /^\/(lesson|hsk|word|practice|listening|flashcards|pinyin)(\/|$)/;

/** Before the split every Chinese page lived at the root; send old links and bookmarks to /zh/…. */
export function LegacyRedirect() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const { pathname, search, hash } = window.location;
    const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    if (LEGACY.test(rest)) window.location.replace(`${base}/zh${rest}${search}${hash}`);
  }, []);
  return null;
}
