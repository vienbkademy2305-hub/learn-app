const TONES = {
  neutral: "bg-stone-100 text-stone-600 ring-stone-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  jade: "bg-jade-50 text-jade-700 ring-jade-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
} as const;

export function Badge({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: keyof typeof TONES; className?: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/**
 * `level`: HSK 3.0 (2021) curriculum level. `exam`: level in the 2025 exam syllabus (exam from 2026-12) — shown as
 * "⭐ Đề thi HSKn" so the learner sees which words the real exam asks for.
 */
export function HskBadge({ level, exam }: { level: string | null; exam?: string | null }) {
  return (
    <>
      {level ? <Badge tone="brand">HSK {level}</Badge> : !exam && <Badge>Ngoài HSK</Badge>}
      {exam && (
        <Badge tone="amber" className="gap-0.5">
          <span aria-hidden>⭐</span> Đề thi HSK{exam}
        </Badge>
      )}
    </>
  );
}
