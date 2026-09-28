/**
 * Pitch contour chart: the learner's voice (solid) over the target (dashed) —
 * tone templates for a word, the model recording for a sentence. Semitones on y.
 */
const W = 320;
const H = 120;
const PAD = 8;
const MIN = -7;
const MAX = 6;

const y = (v: number) => PAD + ((MAX - Math.max(MIN, Math.min(MAX, v))) / (MAX - MIN)) * (H - 2 * PAD);

function path(values: number[], x0: number, x1: number): string {
  if (values.length === 0) return "";
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(x0 + ((x1 - x0) * i) / Math.max(1, values.length - 1)).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
}

export function ContourChart({
  segments,
  label,
}: {
  /** one segment per syllable (word) or a single segment (sentence) */
  segments: Array<{ learner: number[]; target: number[]; ok?: boolean | null; caption?: string }>;
  label: string;
}) {
  const slot = (W - 2 * PAD) / Math.max(1, segments.length);
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm rounded-lg bg-stone-50" role="img" aria-label={label}>
        <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="#d6d3d1" strokeDasharray="2 3" />
        {segments.map((s, i) => {
          const x0 = PAD + i * slot + 6;
          const x1 = PAD + (i + 1) * slot - 6;
          const color = s.ok === false ? "#c73c27" : s.ok === true ? "#1f8a5b" : "#57534e";
          return (
            <g key={i}>
              {i > 0 && <line x1={PAD + i * slot} x2={PAD + i * slot} y1={PAD} y2={H - PAD} stroke="#e7e5e4" />}
              <path d={path(s.target, x0, x1)} fill="none" stroke="#a8a29e" strokeWidth={2} strokeDasharray="5 4" />
              <path d={path(s.learner, x0, x1)} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              {s.caption && (
                <text x={(x0 + x1) / 2} y={H - 2} textAnchor="middle" fontSize="10" fill="#78716c">
                  {s.caption}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 text-xs text-stone-500">
        <span>
          <span className="mr-1 inline-block h-0.5 w-5 bg-stone-400 align-middle" />
          mẫu
        </span>
        <span>
          <span className="mr-1 inline-block h-1 w-5 rounded bg-jade-600 align-middle" />
          giọng bạn
        </span>
      </figcaption>
    </figure>
  );
}
