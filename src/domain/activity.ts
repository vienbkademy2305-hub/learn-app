/**
 * Daily activity (docs/ENGAGEMENT_AI_PLAN.md §1): XP per day, daily goal and streak. Pure functions;
 * persistence lives in src/features/activity/store.ts. Days are local calendar dates (YYYY-MM-DD).
 */

export interface ActivityState {
  v: 1;
  /** local date → XP earned that day */
  days: Record<string, number>;
  /** XP needed for a day to count towards the streak */
  goal: number;
  /** local time "HH:MM" of the daily reminder the learner downloaded, if any */
  reminder?: string;
  /** local date → seconds spent actively learning that day (the app open and in use) */
  time?: Record<string, number>;
}

export const GOALS = [
  { xp: 20, label: "Nhẹ nhàng", hint: "≈ 5 phút" },
  { xp: 50, label: "Vừa phải", hint: "≈ 10–15 phút" },
  { xp: 100, label: "Chăm chỉ", hint: "≈ 25 phút" },
] as const;
export const DEFAULT_GOAL = 50;
export const EMPTY_ACTIVITY: ActivityState = Object.freeze({ v: 1, days: {}, goal: DEFAULT_GOAL }) as ActivityState;

const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The date `n` days before `key` (local calendar arithmetic, safe across daylight-saving changes). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d + n));
}

export function addXp(state: ActivityState, xp: number, now = new Date()): ActivityState {
  if (!(xp > 0)) return state;
  const key = dateKey(now);
  return { ...state, days: { ...state.days, [key]: (state.days[key] ?? 0) + Math.round(xp) } };
}

export const xpOn = (state: ActivityState, key: string) => state.days[key] ?? 0;

/* ---------- study time ---------- */

const MAX_SECONDS_PER_DAY = 86_400;

export function addSeconds(state: ActivityState, seconds: number, now = new Date()): ActivityState {
  if (!(seconds > 0)) return state;
  const key = dateKey(now);
  const total = Math.min(MAX_SECONDS_PER_DAY, (state.time?.[key] ?? 0) + Math.round(seconds));
  return { ...state, time: { ...state.time, [key]: total } };
}

export const secondsOn = (state: ActivityState, key: string) => state.time?.[key] ?? 0;

export interface TimePoint {
  key: string;
  minutes: number;
}

/** The last `days` days (oldest first, ending today) with the minutes studied on each. */
export function timeSeries(state: ActivityState, days: number, now = new Date()): TimePoint[] {
  const today = dateKey(now);
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - (days - 1));
    return { key, minutes: Math.round((secondsOn(state, key) / 60) * 10) / 10 };
  });
}

/** A round upper bound for a chart axis: 5, 10, 15, 30, 45, 60, 90, 120 … minutes. */
export function niceMax(minutes: number): number {
  const steps = [5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720];
  return steps.find((n) => n >= minutes) ?? Math.ceil(minutes / 60) * 60;
}

/** "1 giờ 05 phút" / "42 phút" / "0 phút" */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${String(m % 60).padStart(2, "0")} phút`;
}
export const reachedGoal = (state: ActivityState, key: string) => xpOn(state, key) >= state.goal;
/** A day counts as a study day as soon as any learning action earned XP (the goal only fills the ring). */
export const studied = (state: ActivityState, key: string) => xpOn(state, key) > 0;

export interface Streak {
  /** consecutive study days, ending today — or yesterday while today is still open */
  current: number;
  best: number;
  /** today already counts as a study day */
  todayDone: boolean;
  /** today also reached the daily XP goal */
  goalDone: boolean;
  /** number of days with any study, ever */
  totalDays: number;
}

export function streakOf(state: ActivityState, now = new Date()): Streak {
  const today = dateKey(now);
  const todayDone = studied(state, today);
  let current = 0;
  for (let key = todayDone ? today : addDays(today, -1); studied(state, key); key = addDays(key, -1)) current++;
  // best run over all recorded days
  const done = Object.keys(state.days).filter((k) => studied(state, k)).sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const k of done) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best: Math.max(best, current), todayDone, goalDone: reachedGoal(state, today), totalDays: done.length };
}

/** The last 7 days, oldest first, for the week strip. */
export function weekOf(state: ActivityState, now = new Date()) {
  const today = dateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    return { key, weekday: new Date(y, m - 1, d).getDay(), xp: xpOn(state, key), done: studied(state, key), today: key === today };
  });
}

export const totalXp = (state: ActivityState) => Object.values(state.days).reduce((a, b) => a + b, 0);

/** Level n needs 100·n·(n+1)/2 XP in total: 100, 300, 600, 1000, … (each level a bit longer than the last). */
export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let floor = 0;
  while (xp >= floor + level * 100) {
    floor += level * 100;
    level++;
  }
  return { level, into: xp - floor, need: level * 100 };
}

export function parseActivity(raw: unknown): ActivityState {
  if (!raw || typeof raw !== "object") return EMPTY_ACTIVITY;
  const r = raw as Partial<ActivityState>;
  if (r.v !== 1) return EMPTY_ACTIVITY;
  const days: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.days && typeof r.days === "object" ? r.days : {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && v > 0) days[k] = Math.round(v);
  }
  const goal = GOALS.some((g) => g.xp === r.goal) ? (r.goal as number) : DEFAULT_GOAL;
  const time: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.time && typeof r.time === "object" ? r.time : {})) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && v > 0) time[k] = Math.min(MAX_SECONDS_PER_DAY, Math.round(v));
  }
  return {
    v: 1,
    days,
    goal,
    reminder: typeof r.reminder === "string" && /^\d{2}:\d{2}$/.test(r.reminder) ? r.reminder : undefined,
    ...(Object.keys(time).length ? { time } : {}),
  };
}

/* ---------- XP for progress changes ---------- */

/** XP per kind of change: the progress stores compare top-level fields of the old and new state. */
export const XP = { word: 3, card: 2, game: 2, exercise: 10, step: 5, lesson: 20, speaking: 5, writing: 10, test: 20, listen: 1, note: 5, chat: 4 } as const;

type Rec = Record<string, unknown> | undefined;
const size = (o: Rec) => (o ? Object.keys(o).length : 0);
const changed = (a: unknown, b: unknown) => a !== b;

/** XP earned by the change from `prev` to `next` of the Chinese progress (src/domain/progress.ts). */
export function zhChangeXp(p: object, n: object): number {
  const prev = p as Record<string, unknown>;
  const next = n as Record<string, unknown>;
  let xp = 0;
  if (size(next.learned as Rec) > size(prev.learned as Rec)) xp += XP.word;
  if (changed(prev.cards, next.cards)) xp += XP.card;
  if (changed(prev.mastery, next.mastery)) xp += XP.game;
  if (changed(prev.exercises, next.exercises)) xp += XP.exercise;
  if (changed(prev.lessons, next.lessons)) {
    const done = (o: unknown) => Object.values((o ?? {}) as Record<string, { completedAt?: string }>).filter((l) => l.completedAt).length;
    xp += done(next.lessons) > done(prev.lessons) ? XP.lesson : XP.step;
  }
  if (changed(prev.speaking, next.speaking)) xp += XP.speaking;
  if (changed(prev.notes, next.notes)) xp += XP.note;
  if (changed(prev.listening, next.listening)) xp += XP.listen;
  return xp;
}

/** XP earned by the change from `prev` to `next` of the English progress (src/features/en/progress.ts). */
export function enChangeXp(p: object, n: object): number {
  const prev = p as Record<string, unknown>;
  const next = n as Record<string, unknown>;
  let xp = 0;
  if (changed(prev.steps, next.steps)) xp += XP.step;
  if (changed(prev.exercises, next.exercises)) xp += XP.exercise;
  if (changed(prev.homework, next.homework)) xp += XP.writing;
  if (changed(prev.cards, next.cards)) xp += XP.card;
  if (changed(prev.mastery, next.mastery)) xp += XP.game;
  if (changed(prev.tests, next.tests)) xp += XP.test;
  if (changed(prev.speaking, next.speaking)) xp += XP.speaking;
  return xp;
}

/* ---------- Reminder as a calendar event ---------- */

/** A daily repeating calendar event with an alarm — the only reminder a static site can make reliable on a phone. */
export function reminderIcs(time: string, url: string, now = new Date()): string {
  const [hh, mm] = time.split(":");
  const day = dateKey(now).replace(/-/g, "");
  const stamp = `${day}T${hh}${mm}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hoc ngoai ngu//Nhac hoc//VI",
    "BEGIN:VEVENT",
    "UID:nhac-hoc-moi-ngay@learn-app",
    `DTSTAMP:${day}T000000Z`,
    `DTSTART:${stamp}`,
    "DURATION:PT15M",
    "RRULE:FREQ=DAILY",
    "SUMMARY:Đến giờ học ngoại ngữ 🔥",
    `DESCRIPTION:Giữ chuỗi ngày học của bạn! ${url}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Đến giờ học ngoại ngữ",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/* ---------- History by week / month ---------- */

export interface DayCell {
  key: string;
  /** day of the month, 1–31 */
  day: number;
  xp: number;
  done: boolean;
  today: boolean;
  future: boolean;
}

export interface Period {
  /** "T2 19/10 – CN 25/10" or "Tháng 10/2026" */
  label: string;
  /** cells in calendar order, Monday first; null pads the first week of a month */
  cells: (DayCell | null)[];
  studiedDays: number;
  xp: number;
}

function cell(state: ActivityState, key: string, today: string): DayCell {
  return { key, day: Number(key.slice(8)), xp: xpOn(state, key), done: studied(state, key), today: key === today, future: key > today };
}

function summarise(label: string, cells: (DayCell | null)[]): Period {
  const real = cells.filter((c): c is DayCell => c !== null);
  return { label, cells, studiedDays: real.filter((c) => c.done).length, xp: real.reduce((a, c) => a + c.xp, 0) };
}

const mondayIndex = (key: string) => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
};
const dm = (key: string) => `${key.slice(8)}/${key.slice(5, 7)}`;

/** The Monday-to-Sunday week `offset` weeks away from the week of `now` (0 = this week, -1 = last week). */
export function weekPeriod(state: ActivityState, offset: number, now = new Date()): Period {
  const today = dateKey(now);
  const monday = addDays(today, -mondayIndex(today) + offset * 7);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return summarise(`${dm(keys[0]!)} – ${dm(keys[6]!)}`, keys.map((k) => cell(state, k, today)));
}

/** The calendar month `offset` months away from the month of `now`. */
export function monthPeriod(state: ActivityState, offset: number, now = new Date()): Period {
  const today = dateKey(now);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  const length = new Date(y, m + 1, 0).getDate();
  const start = dateKey(first);
  const cells: (DayCell | null)[] = Array.from({ length: mondayIndex(start) }, () => null);
  for (let d = 0; d < length; d++) cells.push(cell(state, addDays(start, d), today));
  return summarise(`Tháng ${m + 1}/${y}`, cells);
}
