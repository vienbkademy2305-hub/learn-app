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
export const reachedGoal = (state: ActivityState, key: string) => xpOn(state, key) >= state.goal;

export interface Streak {
  /** consecutive days that reached the goal, ending today — or yesterday while today is still open */
  current: number;
  best: number;
  /** today already reached the goal */
  todayDone: boolean;
}

export function streakOf(state: ActivityState, now = new Date()): Streak {
  const today = dateKey(now);
  const todayDone = reachedGoal(state, today);
  let current = 0;
  for (let key = todayDone ? today : addDays(today, -1); reachedGoal(state, key); key = addDays(key, -1)) current++;
  // best run over all recorded days
  const done = Object.keys(state.days).filter((k) => reachedGoal(state, k)).sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const k of done) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best: Math.max(best, current), todayDone };
}

/** The last 7 days, oldest first, for the week strip. */
export function weekOf(state: ActivityState, now = new Date()) {
  const today = dateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const [y, m, d] = key.split("-").map(Number) as [number, number, number];
    return { key, weekday: new Date(y, m - 1, d).getDay(), xp: xpOn(state, key), done: reachedGoal(state, key), today: key === today };
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
  return { v: 1, days, goal, reminder: typeof r.reminder === "string" && /^\d{2}:\d{2}$/.test(r.reminder) ? r.reminder : undefined };
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
