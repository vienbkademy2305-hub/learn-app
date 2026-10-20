import type { Metadata } from "next";
import { stories } from "@/content/stories";
import { StoryList } from "@/features/stories/StoryList";

export const metadata: Metadata = { title: "Truyện trinh thám" };

export default function StoriesPage() {
  return <StoryList stories={stories().map((s) => ({ id: s.id, level: s.level, cover: s.cover, title_vi: s.title_vi, witnesses: s.witnesses.length }))} />;
}
