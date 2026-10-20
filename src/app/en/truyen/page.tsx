import type { Metadata } from "next";
import { storiesOf } from "@/content/stories";
import { StoryList } from "@/features/stories/StoryList";

export const metadata: Metadata = { title: "Truyện trinh thám" };

export default function StoriesPage() {
  return <StoryList lang="en" stories={storiesOf("en").map((s) => ({ id: s.id, level: s.level, cover: s.cover, title_vi: s.title_vi, witnesses: s.witnesses.length }))} />;
}
