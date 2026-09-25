import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p lang="zh-CN" className="font-han text-6xl text-stone-300">没有</p>
      <h1 className="mt-4 text-2xl font-bold text-stone-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-stone-500">Trang bạn tìm không tồn tại hoặc đã được đổi địa chỉ.</p>
      <Link href="/hsk/1" className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
        Về lộ trình HSK1
      </Link>
    </div>
  );
}
