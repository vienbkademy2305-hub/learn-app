import { describe, expect, it } from "vitest";
import { addDays, addXp, EMPTY_ACTIVITY, enChangeXp, levelOf, parseActivity, reminderIcs, streakOf, weekOf, zhChangeXp, type ActivityState } from "@/domain/activity";
import { EMPTY_PROGRESS, reviewCard, setLearned, setLessonCompleted } from "@/domain/progress";

const noon = (key: string) => new Date(`${key}T12:00:00`);
const withDays = (days: Record<string, number>, goal = 50): ActivityState => ({ v: 1, days, goal });

describe("streak", () => {
  it("counts consecutive days that reached the goal", () => {
    const s = withDays({ "2026-10-16": 60, "2026-10-17": 50, "2026-10-18": 70 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 3, best: 3, todayDone: true });
  });
  it("keeps yesterday's streak while today is still open", () => {
    const s = withDays({ "2026-10-16": 60, "2026-10-17": 50, "2026-10-18": 10 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 2, best: 2, todayDone: false });
  });
  it("breaks after a missed day and remembers the best run", () => {
    const s = withDays({ "2026-10-10": 50, "2026-10-11": 50, "2026-10-12": 50, "2026-10-15": 50, "2026-10-18": 50 });
    expect(streakOf(s, noon("2026-10-18"))).toEqual({ current: 1, best: 3, todayDone: true });
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
