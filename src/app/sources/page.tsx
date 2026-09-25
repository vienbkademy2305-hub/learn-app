import type { Metadata } from "next";
import { content } from "@/content/load";

export const metadata: Metadata = { title: "Nguồn dữ liệu" };

/** Attribution required by CC BY-SA sources (docs/ARCHITECTURE.md §21). */
export default function SourcesPage() {
  const { sources, generatedAt } = content();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Nguồn dữ liệu</h1>
        <p className="mt-2 text-stone-600">
          Nội dung được tổng hợp từ các nguồn mở dưới đây. Dữ liệu dẫn xuất từ nguồn CC BY-SA được chia sẻ theo cùng giấy phép.
        </p>
      </div>
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <a href={s.url} className="font-semibold text-brand-700 hover:underline" rel="noreferrer" target="_blank">
              {s.name}
            </a>
            <p className="mt-1 text-sm text-stone-500">Giấy phép: {s.license}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-500">
        Audio câu ví dụ là <strong>giọng tổng hợp</strong> (CosyVoice2) từ bộ dữ liệu hsk-sentences-audio. Bản dịch câu tiếng Việt là bản nháp đang chờ biên tập.
      </p>
      <p className="text-xs text-stone-400">Dữ liệu tạo lúc {new Date(generatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p>
    </div>
  );
}
