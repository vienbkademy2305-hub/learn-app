import type { Metadata } from "next";
import { getLesson, getLessons } from "@/content/load";
import { zhDialogue } from "@/content/zh-dialogues";
import { PracticeFrame } from "@/features/practice/PracticeFrame";
import { DialogueRoleplay } from "@/features/speaking/DialogueRoleplay";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `Hội thoại đóng vai · Bài ${lesson.number}` : "Hội thoại đóng vai" };
}

/** Chinese role-play: the lesson dialogue, your lines prompted in Vietnamese (data/editorial/dialogues/hsk1.yaml). */
export default async function ZhRoleplayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lines = zhDialogue(slug);
  return (
    <PracticeFrame slug={slug} current="dialogue">
      {lines.length ? (
        <>
          <details className="rounded-2xl border border-stone-200 bg-white p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium text-stone-700">Xem cả bài hội thoại trước khi đóng vai</summary>
            <ol className="mt-3 space-y-2">
              {lines.map((l, i) => (
                <li key={i}>
                  <span lang="zh-CN" className="font-semibold text-sky-800">{l.speaker}：</span>
                  <span lang="zh-CN" className="font-han text-lg">{l.text}</span>
                  <span className="block text-brand-700">{l.pinyin}</span>
                  <span className="block text-stone-500">{l.vi}</span>
                </li>
              ))}
            </ol>
          </details>
          <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
            <DialogueRoleplay lang="zh" lines={lines} />
          </section>
          <p className="text-xs text-stone-500">
            Hội thoại là bản nháp do Claude soạn theo từ vựng của bài (chờ duyệt). Máy dùng nhận dạng giọng nói của trình duyệt (Chrome/Safari, cần Internet) để kiểm tra bạn nói đúng chữ chưa.
          </p>
        </>
      ) : (
        <p className="text-stone-500">Bài này chưa có hội thoại.</p>
      )}
    </PracticeFrame>
  );
}
