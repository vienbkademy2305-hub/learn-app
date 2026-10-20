/** Who is due a study reminder (pure logic, no Deno APIs so vitest can import it). */

export interface ReminderRow {
  user_id: string;
  tz: string;
  /** local "HH:MM" */
  remind_time: string;
  /** local YYYY-MM-DD of the last day with XP */
  last_study_date: string | null;
  /** local YYYY-MM-DD of the last reminder sent */
  last_sent_date: string | null;
}

/** The calendar date and clock time in `tz` at `now`; null for an unknown time zone. */
export function localNow(now: Date, tz: string): { date: string; time: string } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
  } catch {
    return null;
  }
}

/** Due once per local day: the reminder time has passed, nothing studied today, nothing sent today. */
export function isDue(row: ReminderRow, now: Date): boolean {
  const local = localNow(now, row.tz);
  if (!local) return false;
  return local.time >= row.remind_time && row.last_study_date !== local.date && row.last_sent_date !== local.date;
}
