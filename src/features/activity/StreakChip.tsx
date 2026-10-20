"use client";
/** Header chip: 🔥 streak and today's XP against the goal; links to the "Hôm nay" page. */
import Link from "next/link";
import { streakOf, xpOn, dateKey } from "@/domain/activity";
import { useActivity } from "./store";

export function StreakChip() {
  const [activity, , hydrated] = useActivity();
  const streak = streakOf(activity);
  const xp = xpOn(activity, dateKey());
  const pct = Math.min(100, Math.round((xp / activity.goal) * 100));
  const label = !hydrated
    ? "Chuỗi ngày học"
    : `Chuỗi ${streak.current} ngày · hôm nay ${xp}/${activity.goal} XP${streak.goalDone ? " (đã đạt mục tiêu)" : ""} · tổng ${streak.totalDays} ngày đã học`;
  return (
    <Link
      href="/hom-nay"
      title={label}
      aria-label={label}
      className="relative flex items-center gap-1 overflow-hidden rounded-md px-2 py-2 text-sm font-bold whitespace-nowrap text-orange-600 hover:bg-orange-50"
    >
      <span aria-hidden className={hydrated && !streak.todayDone && streak.current > 0 ? "opacity-50 grayscale" : ""}>🔥</span>
      <span>{hydrated ? streak.current : 0}</span>
      <span aria-hidden className="absolute inset-x-1.5 bottom-0.5 h-0.5 rounded bg-stone-200">
        <span className="block h-full rounded bg-orange-500" style={{ width: `${hydrated ? pct : 0}%` }} />
      </span>
    </Link>
  );
}
