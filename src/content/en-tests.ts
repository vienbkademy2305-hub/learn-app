/** Server-side helpers for the English stage tests (snapshot `tests`). */
import { testItemCount } from "@/domain/en-test";
import { enContent } from "./en";

export const enTests = () => enContent().tests;
export const enTest = (id: string) => enTests().find((t) => t.id === id);

export const enTestCards = (stage?: number) =>
  enTests()
    .filter((t) => stage === undefined || t.stage === stage)
    .map((t) => ({ id: t.id, title: t.title_vi, kind: t.kind, after: t.after_lesson, minutes: t.minutes, pass: t.pass_percent, items: testItemCount(t) }));

export const enLessonLinks = () => enContent().lessons.map((l) => ({ number: l.number, slug: l.slug, title: l.title_vi }));
