import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AccountMenu } from "@/features/account/AccountMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Học tiếng Trung HSK1", template: "%s · Học tiếng Trung" },
  description: "Học tiếng Trung HSK1 cho người Việt: từ vựng, pinyin, Hán Việt, câu ví dụ có audio.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c73c27",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
              <span className="font-han grid size-8 place-items-center rounded-lg bg-brand-600 text-lg text-white">学</span>
              <span className="hidden sm:inline">Học tiếng Trung</span>
            </Link>
            <nav className="ml-auto flex items-center gap-0.5 text-sm sm:gap-1">
              <Link href="/hsk/1" className="rounded-md px-2 py-2 font-medium whitespace-nowrap text-stone-700 hover:bg-stone-100 sm:px-3">
                <span className="sm:hidden">HSK1</span>
                <span className="hidden sm:inline">Lộ trình HSK1</span>
              </Link>
              <Link href="/practice" className="rounded-md px-2 py-2 font-medium whitespace-nowrap text-stone-700 hover:bg-stone-100 sm:px-3">
                Bài tập
              </Link>
              <Link href="/listening" className="rounded-md px-2 py-2 font-medium whitespace-nowrap text-stone-700 hover:bg-stone-100 sm:px-3">
                <span className="sm:hidden">Nghe</span>
                <span className="hidden sm:inline">Luyện nghe</span>
              </Link>
              <Link href="/flashcards" className="rounded-md px-2 py-2 font-medium whitespace-nowrap text-stone-700 hover:bg-stone-100 sm:px-3">
                Sổ từ
              </Link>
              {/* On phones the attribution link lives in the footer to keep the menu on one line. */}
              <Link href="/sources" className="hidden rounded-md px-3 py-2 whitespace-nowrap text-stone-500 hover:bg-stone-100 sm:inline">
                Nguồn dữ liệu
              </Link>
              <AccountMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:pt-8">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-24 text-xs text-stone-400 sm:pb-8">
          Dữ liệu mở: CVDICT, CC-CEDICT, hsk-sentences-audio (CC BY-SA 4.0), Unihan, Hanzi Writer.{" "}
          <Link href="/sources" className="font-medium text-stone-500 underline-offset-2 hover:underline">
            Nguồn dữ liệu & giấy phép
          </Link>
        </footer>
      </body>
    </html>
  );
}
