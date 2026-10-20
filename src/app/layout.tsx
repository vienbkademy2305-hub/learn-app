import type { Metadata, Viewport } from "next";
import { BottomNav } from "@/features/site/BottomNav";
import { RegisterSW } from "@/features/site/RegisterSW";
import { SiteFooter, SiteHeader } from "@/features/site/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Học ngoại ngữ — tiếng Trung & tiếng Anh", template: "%s · Học ngoại ngữ" },
  description: "Học tiếng Trung HSK và tiếng Anh IELTS cho người Việt: từ vựng, ngữ pháp, câu ví dụ có audio, bài tập.",
  applicationName: "Học ngoại ngữ",
  icons: { apple: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/apple-touch-icon.png` },
  appleWebApp: { capable: true, title: "Học ngoại ngữ", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c73c27",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* apply the saved theme before the first paint (no flash of the light page) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("learn-app:theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}` }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <RegisterSW />
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:pt-8">{children}</main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
