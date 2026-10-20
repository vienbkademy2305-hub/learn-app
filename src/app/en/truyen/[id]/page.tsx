import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storiesOf, story } from "@/content/stories";
import { StoryPlayer } from "@/features/stories/StoryPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return storiesOf("en").map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = story((await params).id);
  return { title: s ? `${s.title_vi} · Truyện trinh thám` : "Truyện trinh thám" };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const s = story((await params).id);
  if (!s || s.lang !== "en") notFound();
  return <StoryPlayer story={s} />;
}
