import { describe, expect, it } from "vitest";
import { isDue, localNow, type ReminderRow } from "../supabase/functions/push-reminder/due";

const row = (o: Partial<ReminderRow> = {}): ReminderRow => ({ user_id: "u", tz: "Asia/Ho_Chi_Minh", remind_time: "20:00", last_study_date: null, last_sent_date: null, ...o });
// 13:30 UTC = 20:30 in Ho Chi Minh (UTC+7)
const evening = new Date("2026-10-19T13:30:00Z");

describe("push reminder due", () => {
  it("reads local date and time in the learner's zone", () => {
    expect(localNow(evening, "Asia/Ho_Chi_Minh")).toEqual({ date: "2026-10-19", time: "20:30" });
    expect(localNow(new Date("2026-10-19T18:00:00Z"), "Asia/Ho_Chi_Minh")?.date).toBe("2026-10-20");
    expect(localNow(evening, "Nowhere/Land")).toBeNull();
  });
  it("is due after the reminder time when nothing was studied or sent today", () => {
    expect(isDue(row(), evening)).toBe(true);
    expect(isDue(row({ last_study_date: "2026-10-18", last_sent_date: "2026-10-18" }), evening)).toBe(true);
  });
  it("is not due before the time, after studying, or after already sending", () => {
    expect(isDue(row({ remind_time: "21:00" }), evening)).toBe(false);
    expect(isDue(row({ last_study_date: "2026-10-19" }), evening)).toBe(false);
    expect(isDue(row({ last_sent_date: "2026-10-19" }), evening)).toBe(false);
    expect(isDue(row({ tz: "bad" }), evening)).toBe(false);
  });
});
