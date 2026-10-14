/** "Bài 3" for HSK1 (unchanged), "HSK2 · Bài 3" for higher levels — lessons are numbered within their level. */
export function lessonLabel(lesson: { number: number; hskLevel?: string | null }): string {
  return !lesson.hskLevel || lesson.hskLevel === "1" ? `Bài ${lesson.number}` : `HSK${lesson.hskLevel} · Bài ${lesson.number}`;
}
