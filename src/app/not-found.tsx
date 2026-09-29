import Link from "next/link";
import { LegacyRedirect } from "@/features/site/SiteChrome";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <LegacyRedirect />
      <p className="text-6xl font-bold text-stone-300">404</p>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-stone-500">Trang bạn tìm không tồn tại hoặc đã được đổi địa chỉ.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/zh/hsk/1" className="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
          Lộ trình HSK1
        </Link>
        <Link href="/en" className="rounded-xl bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800">
          Lộ trình tiếng Anh
        </Link>
      </div>
    </div>
  );
}
