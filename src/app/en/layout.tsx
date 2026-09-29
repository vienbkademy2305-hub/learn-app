import type { Metadata } from "next";
import { EnSyncStarter } from "@/features/en/EnSync";
import { RememberLang } from "@/features/site/SiteChrome";

export const metadata: Metadata = {
  title: { default: "Học tiếng Anh — lộ trình IELTS 6.5", template: "%s · Học tiếng Anh" },
  description: "Học tiếng Anh cho người Việt theo lộ trình IELTS 6.5: từ vựng theo chủ đề có IPA, ngữ pháp, hội thoại, bài tập.",
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="vi">
      <RememberLang lang="en" />
      <EnSyncStarter />
      {children}
    </div>
  );
}
