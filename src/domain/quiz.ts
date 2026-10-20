/** Scoring helpers shared by the one-question-at-a-time quizzes (docs/UI_POLISH_PLAN.md). Pure. */

/** 3 stars from 85 %, 2 from 60 %, otherwise 1 (finishing always earns a star). */
export function starsFor(correct: number, total: number): 1 | 2 | 3 {
  const pct = total ? correct / total : 0;
  return pct >= 0.85 ? 3 : pct >= 0.6 ? 2 : 1;
}

export const percentOf = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);

/** 289 → "04:49" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
