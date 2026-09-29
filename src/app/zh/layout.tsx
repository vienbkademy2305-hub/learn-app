import type { Metadata } from "next";
import { RememberLang } from "@/features/site/SiteChrome";

export const metadata: Metadata = {
  title: { default: "Học tiếng Trung HSK1", template: "%s · Học tiếng Trung" },
  description: "Học tiếng Trung HSK1 cho người Việt: từ vựng, pinyin, Hán Việt, câu ví dụ có audio.",
};

export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RememberLang lang="zh" />
      {children}
    </>
  );
}
