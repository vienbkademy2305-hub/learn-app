import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { zhTest, zhTests } from "@/content/zh-tests";
import { ZhTestRunner } from "@/features/zh-test/ZhTestRunner";

export const dynamicParams = false;
export const generateStaticParams = () => zhTests().map((t) => ({ id: t.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: zhTest((await params).id)?.title_vi ?? "Đề luyện thi" };
}

export default async function ZhTestPage({ params }: { params: Promise<{ id: string }> }) {
  const test = zhTest((await params).id);
  if (!test) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">{test.title_vi}</h1>
      <ZhTestRunner test={test} />
    </div>
  );
}
