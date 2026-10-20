/** Numbers for the "Luyện tập" hub (docs/UI_POLISH_PLAN.md). Pure. */

type Cards = Record<string, { due: string; reviews: number }> | undefined;

/** Cards that were already reviewed once and whose next review date has come ("cần ôn lại"). */
export function dueReviewed(cards: Cards, now = new Date()): number {
  const t = now.toISOString();
  return Object.values(cards ?? {}).filter((c) => c.reviews > 0 && c.due <= t).length;
}

/** First item that is not done, falling back to the first one (so the hub always has a suggestion). */
export function nextOf<T>(items: T[], isDone: (item: T) => boolean): T | undefined {
  return items.find((i) => !isDone(i)) ?? items[0];
}
