"use client";
/** Area chart of the minutes studied per day (last 7 / 30 / 90 days), drawn as plain SVG. */
import { useState } from "react";
import { dateKey, formatMinutes, niceMax, timeSeries } from "@/domain/activity";
import { useActivity } from "./store";

const RANGES = [7, 30, 90] as const;
const W = 640;
const H = 240;
const PAD = { l: 44, r: 14, t: 14, b: 30 };

const dm = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;

/** A smooth curve through the points (Catmull-Rom → cubic Bézier), never dipping below the baseline. */
function smoothPath(pts: Array<[number, number]>, floor: number): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(floor, p1[1] + (p2[1] - p0[1]) / 6);
    const c2y = Math.min(floor, p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function StudyTimeChart() {
  const [activity, , hydrated] = useActivity();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [hover, setHover] = useState<number | null>(null);

  const series = timeSeries(hydrated ? activity : { v: 1, days: {}, goal: 50 }, range);
  const values = series.map((p) => p.minutes);
  const top = niceMax(Math.max(5, ...values));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (series.length === 1 ? iw / 2 : (i * iw) / (series.length - 1));
  const y = (v: number) => PAD.t + (1 - v / top) * ih;
  const floor = PAD.t + ih;
  const pts = series.map((p, i) => [x(i), y(p.minutes)] as [number, number]);
  const line = smoothPath(pts, floor);
  const area = pts.length ? `${line} L${pts[pts.length - 1]![0]},${floor} L${pts[0]![0]},${floor} Z` : "";

  const total = values.reduce((a, b) => a + b, 0);
  const studiedDays = values.filter((v) => v > 0).length;
  const best = series.reduce((b, p) => (p.minutes > b.minutes ? p : b), series[0]!);
  const today = series[series.length - 1]!;
  const shown = hover ?? series.length - 1;
  const sel = series[shown]!;
  const ticks = [0, top / 2, top];
  const labelAt = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  const pointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / iw) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="study-time-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="study-time-title" className="font-semibold text-stone-900">Thời lượng học</h2>
        <div className="flex gap-1" role="tablist" aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${range === r ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            >
              {r} ngày
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-stone-600" aria-live="polite">
        <strong className="text-stone-900">{dm(sel.key)}{sel.key === dateKey() ? " (hôm nay)" : ""}</strong>: {formatMinutes(sel.minutes)}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={`Biểu đồ thời lượng học ${range} ngày gần nhất: tổng ${formatMinutes(total)}, ${studiedDays} ngày có học`}
        onPointerMove={pointer}
        onPointerDown={pointer}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="study-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeDasharray={t === 0 ? undefined : "4 4"} />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#78716c">{t >= 60 ? `${Math.round((t / 60) * 10) / 10}g` : `${Math.round(t)}'`}</text>
          </g>
        ))}
        {area && <path d={area} fill="url(#study-area)" />}
        {line && <path d={line} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {labelAt.map((i, k) => (
          <text key={`${i}-${k}`} x={x(i)} y={H - 8} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} fontSize="12" fill="#78716c">{dm(series[i]!.key)}</text>
        ))}
        {hover !== null && <line x1={x(shown)} x2={x(shown)} y1={PAD.t} y2={floor} stroke="#fdba74" strokeWidth="1.5" />}
        <circle cx={x(shown)} cy={y(sel.minutes)} r="5.5" fill="#ea580c" stroke="#fff" strokeWidth="2" />
      </svg>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-stone-500">
        <div className="rounded-xl bg-stone-50 p-2">
          <dt>Hôm nay</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">{formatMinutes(today.minutes)}</dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-2">
          <dt>Tổng {range} ngày</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">{formatMinutes(total)}</dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-2">
          <dt>Trung bình / ngày học</dt>
          <dd className="mt-0.5 text-base font-bold text-stone-900">{studiedDays ? formatMinutes(total / studiedDays) : "–"}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-stone-400">
        {best.minutes > 0 ? `Ngày học nhiều nhất: ${dm(best.key)} (${formatMinutes(best.minutes)}). ` : ""}
        Thời lượng chỉ tính khi bạn đang mở và dùng app (tối đa 1 phút không thao tác), lưu trên trình duyệt này và bắt đầu ghi từ bản cập nhật này.
      </p>

      <table className="sr-only">
        <caption>Số phút học mỗi ngày</caption>
        <thead>
          <tr><th>Ngày</th><th>Phút</th></tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.key}><td>{p.key}</td><td>{p.minutes}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
