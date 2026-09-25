import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
            <nav className="ml-auto flex items-center gap-1 text-sm">
              <Link href="/hsk/1" className="rounded-md px-3 py-2 font-medium text-stone-700 hover:bg-stone-100">
                Lộ trình HSK1
              </Link>
              <Link href="/sources" className="rounded-md px-3 py-2 text-stone-500 hover:bg-stone-100">
                Nguồn dữ liệu
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-8">{children}</main>
      </body>
    </html>
  );
}
