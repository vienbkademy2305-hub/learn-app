/** HSK3 review lessons (exam level-3 words already taught in HSK1–2): slugs like hsk3-01r-people, hsk3-09s-…; no new grammar. */
export const isReviewLesson = (slug: string) => /^hsk3-\d{2}[r-z]-/.test(slug);

/** "Bài 3" for HSK1 (unchanged), "HSK2 · Bài 3" for higher levels — lessons are numbered within their level. */
export function lessonLabel(lesson: { number: number; hskLevel?: string | null }): string {
  return !lesson.hskLevel || lesson.hskLevel === "1" ? `Bài ${lesson.number}` : `HSK${lesson.hskLevel} · Bài ${lesson.number}`;
}
