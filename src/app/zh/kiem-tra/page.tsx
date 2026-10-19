import type { Metadata } from "next";
import Link from "next/link";
import { zhTestCards } from "@/content/zh-tests";

export const metadata: Metadata = { title: "Đề luyện thi" };

export default function ZhTestsPage() {
  const cards = zhTestCards();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Đề luyện thi</h1>
        <p className="mt-1 text-stone-500">
          Đề tự soạn theo khuôn đề HSK mới (Nghe · Đọc · Viết), có chấm điểm theo từng phần. Kết quả lưu trên trình duyệt này.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.id}>
            <Link href={`/zh/kiem-tra/${c.id}`} className="block rounded-2xl border border-stone-200 bg-white p-5 shadow-sm active:bg-stone-50">
              <p className="font-semibold text-stone-900">{c.title}</p>
              <p className="mt-1 text-sm text-stone-500">
                {c.items} câu · ~{c.minutes} phút · đạt {c.pass}%{c.status === "draft" && " · bản nháp"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-500">
        Muốn thêm đề thật? Xem <Link href="/de-them" className="underline">Đề luyện thêm (Study4)</Link>.
      </p>
    </div>
  );
}
