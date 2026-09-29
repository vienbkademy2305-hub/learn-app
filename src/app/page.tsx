import Link from "next/link";
import { ContinueLang } from "@/features/site/ContinueLang";

export default function ChooseLanguagePage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">Hôm nay bạn học gì?</h1>
        <p className="mt-2 text-stone-500">Chọn một ngôn ngữ. Tiến độ của mỗi ngôn ngữ được lưu riêng.</p>
        <ContinueLang />
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/zh"
          className="group overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-md transition-transform hover:-translate-y-0.5 sm:p-8"
        >
          <p lang="zh-CN" className="font-han text-5xl">你好</p>
          <h2 className="mt-4 text-2xl font-bold">Tiếng Trung</h2>
          <p className="mt-1 text-brand-50">Lộ trình HSK1: chữ Hán, pinyin, Hán Việt, luyện viết, luyện nói thanh điệu.</p>
          <span className="mt-5 inline-block rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold group-hover:bg-white/25">Học tiếng Trung →</span>
        </Link>
        <Link
          href="/en"
          className="group overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 to-sky-900 p-6 text-white shadow-md transition-transform hover:-translate-y-0.5 sm:p-8"
        >
          <p lang="en" className="text-5xl font-bold tracking-tight">Hello</p>
          <h2 className="mt-4 text-2xl font-bold">Tiếng Anh</h2>
          <p className="mt-1 text-sky-50">Lộ trình IELTS 6.5 — Giai đoạn 1: từ vựng theo chủ đề, IPA, ngữ pháp nền tảng, hội thoại, bài tập.</p>
          <span className="mt-5 inline-block rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold group-hover:bg-white/25">Học tiếng Anh →</span>
        </Link>
      </div>
    </div>
  );
}
