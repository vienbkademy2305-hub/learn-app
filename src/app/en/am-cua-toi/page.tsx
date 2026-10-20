import type { Metadata } from "next";
import Link from "next/link";
import { PhoneBoard } from "@/features/en/PhoneBoard";

export const metadata: Metadata = { title: "Âm của tôi" };

export default function MySoundsPage() {
  return (
    <div className="space-y-5">
      <nav className="text-sm text-stone-500">
        <Link href="/en/luyen-noi" className="hover:text-sky-800">Luyện nói</Link> › Âm của tôi
      </nav>
      <header>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Âm của tôi</h1>
        <p className="mt-1 text-stone-600">Mỗi lần bạn chấm phát âm, app ghi lại từng âm đọc đúng hay sai. Ở đây bạn thấy âm nào cần luyện, kèm mẹo và cặp từ để phân biệt (think / sink, ship / sheep…).</p>
      </header>
      <PhoneBoard />
    </div>
  );
}
