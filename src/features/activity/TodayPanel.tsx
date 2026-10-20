"use client";
/** The "Hôm nay" page: streak, daily-goal ring, week strip, level, goal choice and the calendar reminder. */
import Link from "next/link";
import { GOALS, dateKey, levelOf, reminderIcs, streakOf, totalXp, xpOn } from "@/domain/activity";
import { HistoryPanel } from "./HistoryPanel";
import { StudyTimeChart } from "./StudyTimeChart";
import { PushPanel } from "./PushPanel";
import { useActivity } from "./store";

function downloadReminder(time: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const url = `${window.location.origin}${base}/`;
  const blob = new Blob([reminderIcs(time, url)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nhac-hoc-moi-ngay.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function TodayPanel() {
  const [activity, { setGoal, setReminder }, hydrated] = useActivity();
  const streak = streakOf(activity);
  const today = xpOn(activity, dateKey());
  const pct = Math.min(1, today / activity.goal);
  const level = levelOf(totalXp(activity));
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-orange-500 to-rose-600 p-6 text-white shadow-md">
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90" role="img" aria-label={`Hôm nay ${today} trên ${activity.goal} XP`}>
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="10" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (hydrated ? pct : 0))} />
            <text x="60" y="60" transform="rotate(90 60 60)" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="22" fontWeight="700">
              {hydrated ? today : 0}
            </text>
          </svg>
          <div>
            <p className="text-5xl font-extrabold leading-none">
              🔥 {hydrated ? streak.current : 0}
              <span className="ml-2 text-lg font-semibold">ngày liên tiếp</span>
            </p>
            <p className="mt-2 text-sm text-orange-50">
              {!hydrated
                ? ""
                : streak.goalDone
                  ? "Hôm nay đã đạt mục tiêu — chuỗi được giữ! 🎉"
                  : streak.todayDone
                    ? `Chuỗi đã được giữ hôm nay. Còn ${activity.goal - today} XP nữa để đạt mục tiêu.`
                    : `Học một chút để ${streak.current > 0 ? "giữ chuỗi" : "bắt đầu chuỗi"} hôm nay.`}
            </p>
            <p className="mt-1 text-xs text-orange-100">
              Chuỗi dài nhất: {hydrated ? streak.best : 0} ngày · Tổng số ngày đã học: {hydrated ? streak.totalDays : 0}
            </p>
          </div>
        </div>
      </section>

      <HistoryPanel />

      <StudyTimeChart />

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Cấp độ</h2>
        <p className="mt-3 text-sm text-stone-600">
          Cấp {level.level} · tổng {hydrated ? totalXp(activity) : 0} XP
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={level.into} aria-valuemax={level.need} aria-label="Tiến độ lên cấp">
          <div className="h-full rounded-full bg-sky-600" style={{ width: `${hydrated ? Math.round((level.into / level.need) * 100) : 0}%` }} />
        </div>
        <p className="mt-1 text-xs text-stone-500">Còn {level.need - level.into} XP để lên cấp {level.level + 1}.</p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Mục tiêu mỗi ngày</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Mục tiêu mỗi ngày">
          {GOALS.map((g) => (
            <button
              key={g.xp}
              type="button"
              role="radio"
              aria-checked={activity.goal === g.xp}
              onClick={() => setGoal(g.xp)}
              className={`rounded-xl border p-3 text-left ${activity.goal === g.xp ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:bg-stone-50"}`}
            >
              <span className="block font-semibold text-stone-900">{g.label} · {g.xp} XP</span>
              <span className="block text-xs text-stone-500">{g.hint}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          XP tính khi bạn học: học từ +3, ôn thẻ +2, chơi game từ +2, làm bài tập +10, qua một bước bài học +5, xong buổi +20, luyện nói +5, bài kiểm tra +20, trả lời hội thoại AI +4.
          Dữ liệu chuỗi ngày lưu trên trình duyệt này.
        </p>
      </section>

      <PushPanel />

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Nhắc học mỗi ngày</h2>
        <p className="mt-1 text-sm text-stone-600">
          Web tĩnh không tự bật thông báo khi đã đóng trang được. Cách chắc chắn nhất: thêm một sự kiện lặp hằng ngày vào lịch điện thoại (Google Calendar, Apple Calendar) — có chuông báo đúng giờ.
        </p>
        <form
          className="mt-3 flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const time = new FormData(e.currentTarget).get("time");
            if (typeof time === "string" && /^\d{2}:\d{2}$/.test(time)) {
              setReminder(time);
              downloadReminder(time);
            }
          }}
        >
          <label className="text-sm text-stone-700">
            Giờ nhắc{" "}
            <input type="time" name="time" required defaultValue={activity.reminder ?? "20:00"} key={activity.reminder ?? "none"} className="rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            Tải lời nhắc vào lịch
          </button>
          {activity.reminder && <span className="text-xs text-stone-500">Đã tạo lời nhắc {activity.reminder} (mở file .ics vừa tải để thêm vào lịch).</span>}
        </form>
      </section>

      <p className="text-sm">
        <Link href="/" className="font-medium text-sky-800 hover:underline">← Về trang chọn ngôn ngữ</Link>
      </p>
    </div>
  );
}
