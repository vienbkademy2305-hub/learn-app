import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đề luyện thêm (Study4)" };

type Item = { label: string; href: string; note: string };

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: "Tiếng Trung — HSK",
    items: [
      { label: "HSK 1", href: "https://study4.com/tests/hsk-1/", note: "Đề thi thử cấp 1" },
      { label: "HSK 2", href: "https://study4.com/tests/hsk-2/", note: "Đề thi thử cấp 2" },
      { label: "HSK 3", href: "https://study4.com/tests/hsk-3/", note: "Đề thi thử cấp 3 — hợp với lộ trình HSK3 của app" },
      { label: "HSK 3 mini test", href: "https://study4.com/tests/hsk-3/mini/", note: "Bài làm ngắn, ôn nhanh" },
    ],
  },
  {
    title: "Tiếng Anh — IELTS",
    items: [
      { label: "IELTS Academic", href: "https://study4.com/tests/ielts/", note: "Đề Listening / Reading / Writing đủ 4 kỹ năng" },
      { label: "IELTS General", href: "https://study4.com/tests/ielts-general/", note: "Bản General Training" },
      { label: "TOEIC", href: "https://study4.com/tests/toeic/", note: "Nếu cần thêm đề nghe-đọc ở trình độ thấp hơn" },
    ],
  },
];

export default function ExtraTestsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-900">Đề luyện thêm</h1>
        <p className="mt-1 text-stone-600">
          Liên kết sang kho đề của Study4 để làm bài thi thử bổ sung. App chỉ dẫn link, không sao chép nội dung đề —
          Study4 không có API mở và đề thuộc bản quyền của họ. Cần đăng nhập Study4 để làm và lưu kết quả.
        </p>
      </header>
      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-800">{g.title}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.items.map((it) => (
              <li key={it.href}>
                <a
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-brand-600"
                >
                  <span className="font-semibold text-stone-900">{it.label} ↗</span>
                  <span className="mt-0.5 block text-sm text-stone-500">{it.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
