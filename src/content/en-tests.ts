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

/**
 * Where to go after finishing a test: another test of the same block (mini → exit test), otherwise the next lesson,
 * otherwise back to the map. This chains lessons 1–5 → test → lessons 6–10 → test … without going back to the list.
 */
export function enTestNext(testId: string): { href: string; label: string } {
  const tests = enTests();
  const i = tests.findIndex((t) => t.id === testId);
  const cur = tests[i];
  if (!cur) return { href: "/en", label: "Về lộ trình" };
  const sameBlock = tests.slice(i + 1).find((t) => t.after_lesson === cur.after_lesson);
  if (sameBlock) return { href: `/en/kiem-tra/${sameBlock.id}`, label: `Bài tiếp theo: ${sameBlock.title_vi}` };
  const lesson = enLessonLinks().find((l) => l.number === cur.after_lesson + 1);
  if (lesson) return { href: `/en/lesson/${lesson.slug}`, label: `Học tiếp: Buổi ${lesson.number} · ${lesson.title}` };
  return { href: "/en", label: "Hoàn thành lộ trình — về bản đồ" };
}
