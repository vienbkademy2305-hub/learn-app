import type { Metadata } from "next";
import { ExtraTests } from "./ExtraTests";

export const metadata: Metadata = { title: "Đề luyện thêm (Study4)" };

export default function ExtraTestsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Đề luyện thêm</h1>
        <p className="mt-1 text-sm text-stone-600">
          Danh mục đề HSK1–3 và IELTS trên Study4. App chỉ dẫn link (tiêu đề + đường dẫn lấy từ sitemap công khai), không
          sao chép nội dung đề. Cần đăng nhập Study4 để làm và lưu kết quả.
        </p>
      </header>
      <ExtraTests />
    </div>
  );
}
