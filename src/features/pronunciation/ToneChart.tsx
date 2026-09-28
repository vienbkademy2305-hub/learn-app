import { TONES } from "@/content/pronunciation";

const COLORS = ["#78716c", "#1f8a5b", "#d97706", "#2563eb", "#c73c27"];

/** Pitch contours on the 5-level scale (5 = highest), one line per tone. */
export function ToneChart() {
  const W = 300;
  const H = 150;
  const pad = { l: 28, r: 12, t: 10, b: 10 };
  const y = (level: number) => pad.t + ((5 - level) / 4) * (H - pad.t - pad.b);
  const tones = TONES.filter((t) => t.tone !== 0);
  return (
    <figure className="mx-auto w-full max-w-md">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sơ đồ độ cao của 4 thanh điệu">
        {[1, 2, 3, 4, 5].map((l) => (
          <g key={l}>
            <line x1={pad.l} x2={W - pad.r} y1={y(l)} y2={y(l)} stroke="#e7e5e4" strokeDasharray="3 3" />
            <text x={pad.l - 8} y={y(l) + 4} fontSize="10" textAnchor="end" fill="#a8a29e">
              {l}
            </text>
          </g>
        ))}
        {tones.map((t, i) => {
          const slot = (W - pad.l - pad.r) / tones.length;
          const x0 = pad.l + slot * i + 14;
          const x1 = x0 + slot - 28;
          const pts = t.contour.map((lv, k) => `${x0 + ((x1 - x0) * k) / (t.contour.length - 1)},${y(lv)}`);
          const last = pts[pts.length - 1]!.split(",").map(Number);
          return (
            <g key={t.tone}>
              <polyline points={pts.join(" ")} fill="none" stroke={COLORS[t.tone]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={last[0]} cy={last[1]} r="4" fill={COLORS[t.tone]} />
              <text x={(x0 + x1) / 2} y={H - 1} fontSize="11" textAnchor="middle" fill={COLORS[t.tone]} fontWeight="600">
                {t.mark}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-stone-500">Độ cao giọng từ 1 (thấp nhất) đến 5 (cao nhất)</figcaption>
    </figure>
  );
}

export const TONE_COLORS = COLORS;
