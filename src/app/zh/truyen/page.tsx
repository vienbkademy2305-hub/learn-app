import type { Metadata } from "next";
import { storiesOf } from "@/content/stories";
import { StoryList } from "@/features/stories/StoryList";

export const metadata: Metadata = { title: "Truyện trinh thám tiếng Trung" };

export default function ChineseStoriesPage() {
  return <StoryList lang="zh" stories={storiesOf("zh").map((s) => ({ id: s.id, level: s.level, cover: s.cover, title_vi: s.title_vi, witnesses: s.witnesses.length }))} />;
}
