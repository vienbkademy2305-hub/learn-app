import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storiesOf, story } from "@/content/stories";
import { StoryPlayer } from "@/features/stories/StoryPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return storiesOf("zh").map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = story((await params).id);
  return { title: s ? `${s.title_vi} · Truyện trinh thám tiếng Trung` : "Truyện trinh thám tiếng Trung" };
}

export default async function ChineseStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const s = story((await params).id);
  if (!s || s.lang !== "zh") notFound();
  return <StoryPlayer story={s} />;
}
