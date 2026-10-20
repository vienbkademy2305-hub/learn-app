import { describe, expect, it } from "vitest";
import { addDays, addXp, EMPTY_ACTIVITY, enChangeXp, levelOf, parseActivity, monthPeriod, reminderIcs, streakOf, weekOf, weekPeriod, zhChangeXp, type ActivityState } from "@/domain/activity";
import { EMPTY_PROGRESS, reviewCard, setLearned, setLessonCompleted } from "@/domain/progress";

const noon = (key: string) => new Date(`${key}T12:00:00`);
const withDays = (days: Record<string, number>, goal = 50): ActivityState => ({ v: 1, days, goal });

describe("streak", () => {
  it("counts consecutive study days", () => {
    const s = withDays({ "2026-10-16": 60, "2026-10-17": 50, "2026-10-18": 70 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 3, best: 3, todayDone: true, goalDone: true, totalDays: 3 });
  });
  it("counts a day as studied before the goal is reached", () => {
    const s = withDays({ "2026-10-16": 60, "2026-10-17": 50, "2026-10-18": 10 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 3, best: 3, todayDone: true, goalDone: false, totalDays: 3 });
  });
  it("keeps yesterday's streak while today is still open", () => {
    const s = withDays({ "2026-10-16": 60, "2026-10-17": 5 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 2, best: 2, todayDone: false, goalDone: false, totalDays: 2 });
  });
  it("breaks after a missed day and remembers the best run", () => {
    const s = withDays({ "2026-10-10": 50, "2026-10-11": 50, "2026-10-12": 50, "2026-10-15": 50, "2026-10-18": 50 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 1, best: 3, todayDone: true, goalDone: true, totalDays: 5 });
    expect(streakOf(s, noon("2026-10-20")).current).toBe(0);
  });
  it("crosses month and year ends", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("xp and levels", () => {
  it("adds XP to the day and ignores non-positive amounts", () => {
    const a = addXp(EMPTY_ACTIVITY, 5, noon("2026-10-18"));
    expect(addXp(a, 3, noon("2026-10-18")).days["2026-10-18"]).toBe(8);
    expect(addXp(a, 0, noon("2026-10-18"))).toBe(a);
  });
  it("levels get longer", () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelOf(100)).toEqual({ level: 2, into: 0, need: 200 });
    expect(levelOf(350)).toEqual({ level: 3, into: 50, need: 300 });
  });
  it("week strip has 7 days ending today", () => {
    const w = weekOf(withDays({ "2026-10-18": 60 }), noon("2026-10-18"));
    expect(w).toHaveLength(7);
    expect(w[6]).toMatchObject({ key: "2026-10-18", today: true, done: true });
  });
});

describe("XP from progress changes", () => {
  it("rewards a learned word, a card review and a finished lesson", () => {
    const learned = setLearned(EMPTY_PROGRESS, "w", true);
    expect(zhChangeXp(EMPTY_PROGRESS, learned)).toBe(3);
    expect(zhChangeXp(learned, setLearned(learned, "w", false))).toBe(0);
    expect(zhChangeXp(EMPTY_PROGRESS, reviewCard(EMPTY_PROGRESS, "w", true))).toBe(2);
    expect(zhChangeXp(EMPTY_PROGRESS, setLessonCompleted(EMPTY_PROGRESS, "l", true))).toBe(20);
  });
  it("English: steps, cards, tests", () => {
    const base = { steps: {}, exercises: {}, homework: {}, cards: {}, tests: {}, mastery: {}, speaking: {} };
    expect(enChangeXp(base, { ...base, steps: { a: ["x"] } })).toBe(5);
    expect(enChangeXp(base, { ...base, cards: { a: {} }, mastery: { a: {} } })).toBe(4);
    expect(enChangeXp(base, base)).toBe(0);
  });
});

describe("storage and reminder", () => {
  it("parseActivity drops junk and keeps valid goals", () => {
    expect(parseActivity(null)).toBe(EMPTY_ACTIVITY);
    const p = parseActivity({ v: 1, days: { "2026-10-18": 40, bad: 5, "2026-10-17": -3 }, goal: 77, reminder: "20:30" });
    expect(p).toEqual({ v: 1, days: { "2026-10-18": 40 }, goal: 50, reminder: "20:30" });
    expect(parseActivity({ v: 1, days: {}, goal: 100 }).goal).toBe(100);
  });
  it("builds a daily repeating ics event with an alarm", () => {
    const ics = reminderIcs("20:30", "https://x.test/", noon("2026-10-18"));
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART:20261018T203000");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});

describe("history periods", () => {
  const s = withDays({ "2026-10-19": 30, "2026-10-20": 60, "2026-09-30": 10 });
  it("week starts on Monday and counts study days", () => {
    const w = weekPeriod(s, 0, noon("2026-10-21"));
    expect(w.cells.map((c) => c?.key)[0]).toBe("2026-10-19");
    expect(w.cells).toHaveLength(7);
    expect(w).toMatchObject({ label: "19/10 – 25/10", studiedDays: 2, xp: 90 });
    expect(w.cells[2]).toMatchObject({ today: true });
    expect(w.cells[3]).toMatchObject({ future: true });
    expect(weekPeriod(s, -1, noon("2026-10-21")).label).toBe("12/10 – 18/10");
  });
  it("month pads to Monday and handles previous months", () => {
    const m = monthPeriod(s, 0, noon("2026-10-21"));
    expect(m.label).toBe("Tháng 10/2026");
    expect(m.cells.slice(0, 3)).toEqual([null, null, null]); // 1 Oct 2026 is a Thursday
    expect(m.cells.filter(Boolean)).toHaveLength(31);
    expect(m).toMatchObject({ studiedDays: 2, xp: 90 });
    expect(monthPeriod(s, -1, noon("2026-10-21"))).toMatchObject({ label: "Tháng 9/2026", studiedDays: 1, xp: 10 });
  });
});

import { addSeconds, formatMinutes, niceMax, timeSeries } from "@/domain/activity";

describe("study time", () => {
  it("adds seconds to today, capped at a day, and ignores junk", () => {
    const now = noon("2026-10-20");
    let s = addSeconds(EMPTY_ACTIVITY, 90, now);
    s = addSeconds(s, 30, now);
    expect(s.time).toEqual({ "2026-10-20": 120 });
    expect(addSeconds(s, -5, now)).toBe(s);
    expect(addSeconds(s, 999_999, now).time!["2026-10-20"]).toBe(86_400);
    expect(parseActivity({ v: 1, days: {}, goal: 50, time: { "2026-10-20": 120, bad: 5, "2026-10-19": -1 } }).time).toEqual({ "2026-10-20": 120 });
    expect(parseActivity({ v: 1, days: {}, goal: 50 }).time).toBeUndefined();
  });
  it("builds a series ending today with minutes per day", () => {
    const s: ActivityState = { v: 1, days: {}, goal: 50, time: { "2026-10-20": 600, "2026-10-18": 90 } };
    const series = timeSeries(s, 4, noon("2026-10-20"));
    expect(series.map((p) => p.key)).toEqual(["2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"]);
    expect(series.map((p) => p.minutes)).toEqual([0, 1.5, 0, 10]);
  });
  it("picks round axis maxima and formats durations", () => {
    expect(niceMax(0)).toBe(5);
    expect(niceMax(12)).toBe(15);
    expect(niceMax(61)).toBe(90);
    expect(niceMax(900)).toBe(900);
    expect(formatMinutes(42)).toBe("42 phút");
    expect(formatMinutes(65)).toBe("1 giờ 05 phút");
    expect(formatMinutes(0)).toBe("0 phút");
  });
});
