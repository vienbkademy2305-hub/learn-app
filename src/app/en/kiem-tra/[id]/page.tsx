import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { enLessonLinks, enTest, enTests } from "@/content/en-tests";
import { TestRunner } from "@/features/en/TestRunner";

export const dynamicParams = false;
export const generateStaticParams = () => enTests().map((t) => ({ id: t.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = enTest((await params).id);
  return { title: t?.title_vi ?? "Kiểm tra" };
}

export default async function EnTestPage({ params }: { params: Promise<{ id: string }> }) {
  const test = enTest((await params).id);
  if (!test) notFound();
  return (
    <div className="space-y-6">
      <nav className="text-sm text-stone-500">
        <Link href="/en/kiem-tra" className="hover:text-sky-800">Kiểm tra</Link> › Giai đoạn {test.stage}
      </nav>
      <header>
        <p className="flex items-center gap-2 text-sm font-medium text-sky-800">
          {test.kind === "final" ? "Kiểm tra đầu ra" : `Kiểm tra ngắn · sau Buổi ${test.after_lesson}`}
          {test.status === "draft" && <Badge tone="amber">Bản nháp</Badge>}
        </p>
        <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{test.title_vi}</h1>
      </header>
      <TestRunner test={test} lessons={enLessonLinks()} />
    </div>
  );
}
