"use client";
/** Study history by week or by month, with previous/next navigation (never beyond the current period). */
import { useState } from "react";
import { monthPeriod, weekPeriod } from "@/domain/activity";
import { useActivity } from "./store";

const HEAD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function HistoryPanel() {
  const [activity, , hydrated] = useActivity();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0);
  const period = mode === "week" ? weekPeriod(activity, offset) : monthPeriod(activity, offset);
  const choose = (m: "week" | "month") => {
    setMode(m);
    setOffset(0);
  };
  const nav = "rounded-lg border border-stone-300 px-3 py-1 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900">Lịch sử học</h2>
        <div className="flex gap-1" role="tablist" aria-label="Xem theo">
          {(["week", "month"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => choose(m)}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${mode === m ? "bg-orange-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            >
              {m === "week" ? "Tuần" : "Tháng"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" className={nav} onClick={() => setOffset(offset - 1)} aria-label="Kỳ trước">←</button>
        <p className="text-sm font-semibold text-stone-800">
          {period.label}
          {offset === 0 && <span className="ml-1 font-normal text-stone-500">({mode === "week" ? "tuần này" : "tháng này"})</span>}
        </p>
        <button type="button" className={nav} onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Kỳ sau">→</button>
      </div>
      <ul className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs">
        {HEAD.map((h) => (
          <li key={h} className="font-semibold text-stone-500">{h}</li>
        ))}
        {period.cells.map((c, i) =>
          c ? (
            <li
              key={c.key}
              title={`${c.key}: ${c.xp} XP`}
              className={`rounded-xl py-1.5 ${c.today ? "ring-2 ring-orange-400" : ""} ${c.done ? "bg-orange-100 text-orange-700" : c.future ? "bg-white text-stone-300" : "bg-stone-100 text-stone-500"}`}
            >
              <span className="block text-[11px]">{c.day}</span>
              <span className="block text-base leading-6" aria-hidden>{c.done ? "🔥" : c.future ? "" : "–"}</span>
              <span className="block">{c.future || !hydrated ? "" : `${c.xp}`}</span>
            </li>
          ) : (
            <li key={`pad-${i}`} aria-hidden />
          ),
        )}
      </ul>
      <p className="mt-3 text-sm text-stone-600">
        Đã học <b>{hydrated ? period.studiedDays : 0}</b> ngày · <b>{hydrated ? period.xp : 0}</b> XP trong {mode === "week" ? "tuần" : "tháng"} này
      </p>
    </section>
  );
}
