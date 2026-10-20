"use client";
/**
 * The learning map (docs/STAGE_MAP_UI_PLAN.md): one round node per stage ("chặng") with a progress ring, joined by a
 * winding path. Tapping a node opens a bottom sheet listing the stage's lessons. Used by /en and /zh.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentStageIndex, interleave, summariseStage, type ItemState, type StageSummary } from "@/content/stages";
import { lessonStatus } from "@/domain/progress";
import { bestAttempt, useEnProgress } from "@/features/en/progress";
import { useProgress } from "@/features/progress/store";

export interface MapItem {
  slug: string;
  href: string;
  /** "Buổi 5" / "Bài 3" */
  label: string;
  title: string;
  sub?: string;
  /** lesson number, used to place the stage's tests right after the lesson they follow */
  number?: number;
  /** English: ids of the lesson's graded exercise sets */
  exercises?: string[];
  /** Chinese: word slugs of the lesson */
  words?: string[];
  /** English: number of steps in the lesson */
  steps?: number;
  /** not part of the stage's progress (e.g. the pinyin primer) */
  untracked?: boolean;
}

/** A test that belongs to a stage (shown inside the stage sheet, not further down the page). */
export interface MapTest {
  id: string;
  href: string;
  title: string;
  meta: string;
  kind: "mini" | "final" | "exam";
  /** shown right after the lesson with this number */
  after?: number;
  /** English tests keep their attempts in the English progress store */
  trackEn?: boolean;
}

export interface MapStage {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  /** "Chặng 3" / "Khởi động" */
  tag: string;
  /** small heading shown above the first node of a group, e.g. "HSK 2" or "Giai đoạn 1" */
  group?: string;
  items: MapItem[];
  tests?: MapTest[];
}

const HASH = "#chang-";
/** horizontal drift of consecutive nodes, in px, to make the path wind */
const DRIFT = [0, 56, 0, -56];

const TONES: Record<ItemState, { ring: string; fill: string; text: string }> = {
  done: { ring: "stroke-emerald-500", fill: "bg-emerald-50", text: "text-emerald-700" },
  doing: { ring: "stroke-orange-500", fill: "bg-orange-50", text: "text-orange-700" },
  todo: { ring: "stroke-stone-300", fill: "bg-white", text: "text-stone-500" },
};

function Ring({ percent, state }: { percent: number; state: ItemState }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 88 88" className="absolute inset-0 size-full -rotate-90" aria-hidden>
      <circle cx="44" cy="44" r={r} fill="none" strokeWidth="6" className="stroke-stone-200" />
      <circle cx="44" cy="44" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} className={TONES[state].ring} />
    </svg>
  );
}

const MARK: Record<ItemState, string> = { done: "✓", doing: "●", todo: "○" };
const MARK_STYLE: Record<ItemState, string> = {
  done: "bg-emerald-600 text-white",
  doing: "bg-orange-100 text-orange-700",
  todo: "bg-stone-100 text-stone-400",
};

export function StageMap({ lang, stages }: { lang: "en" | "zh"; stages: MapStage[] }) {
  const [zh, , zhHydrated] = useProgress();
  const [en, , enHydrated] = useEnProgress();
  const hydrated = lang === "en" ? enHydrated : zhHydrated;

  const stateOf = useCallback(
    (it: MapItem): ItemState => {
      if (!hydrated) return "todo";
      if (lang === "en") {
        const ex = it.exercises ?? [];
        const done = ex.filter((id) => en.exercises[id]).length;
        if (ex.length > 0 && done === ex.length) return "done";
        return done > 0 || (en.steps[it.slug]?.length ?? 0) > 0 ? "doing" : "todo";
      }
      const s = lessonStatus(zh, it.slug, it.words ?? []);
      return s === "completed" ? "done" : s === "in_progress" ? "doing" : "todo";
    },
    [lang, hydrated, zh, en],
  );

  const view = useMemo(
    () =>
      stages.map((stage) => {
        const states = stage.items.map(stateOf);
        const tracked = stage.items.map((it, i) => (it.untracked ? null : states[i]!)).filter((s): s is ItemState => s !== null);
        return { stage, states, summary: summariseStage(tracked) as StageSummary };
      }),
    [stages, stateOf],
  );
  const current = hydrated ? currentStageIndex(view.map((v) => v.summary)) : -1;

  const [openId, setOpenId] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  // the open stage lives in the URL hash so the phone's Back button closes the sheet
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash;
      setOpenId(h.startsWith(HASH) ? h.slice(HASH.length) : null);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const open = (id: string) => {
    window.location.hash = `${HASH.slice(1)}${id}`;
  };
  const close = useCallback(() => {
    if (window.location.hash.startsWith(HASH)) window.history.back();
    else setOpenId(null);
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener.current?.focus();
    };
  }, [openId, close]);

  const openView = view.find((v) => v.stage.id === openId);

  // the next thing to do in the open stage, in the order lessons and tests are listed (lessons 1–5, test, lessons 6–10, test …)
  const nextTarget = (() => {
    if (!openView) return null;
    for (const row of interleave(openView.stage.items, openView.stage.tests ?? [])) {
      if (row.kind === "item") {
        if (!row.item.untracked && openView.states[row.index] !== "done") {
          return { href: row.item.href, label: openView.summary.done === 0 && openView.summary.state === "todo" ? "Bắt đầu chặng" : "Học tiếp" };
        }
      } else if (row.test.trackEn && !(hydrated && bestAttempt(en, row.test.id)?.passed)) {
        return { href: row.test.href, label: `Làm bài kiểm tra: ${row.test.title}` };
      }
    }
    return null;
  })();

  return (
    <div className="relative">
      <ol className="relative mx-auto flex max-w-md flex-col items-center gap-2 py-2">
        <span aria-hidden className="absolute inset-y-6 left-1/2 w-0 -translate-x-1/2 border-l-4 border-dotted border-stone-200" />
        {view.map(({ stage, summary }, i) => {
          const showGroup = stage.group && stage.group !== view[i - 1]?.stage.group;
          const isCurrent = i === current;
          const tone = TONES[summary.state];
          return (
            <li key={stage.id} className="relative z-10 flex w-full flex-col items-center">
              {showGroup && <p className="mb-3 mt-4 rounded-full bg-stone-800 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">{stage.group}</p>}
              <div style={{ transform: `translateX(${DRIFT[i % DRIFT.length]}px)` }} className="flex flex-col items-center py-3">
                {isCurrent && <span className="mb-1 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">Học tiếp</span>}
                <button
                  type="button"
                  onClick={(e) => {
                    opener.current = e.currentTarget;
                    open(stage.id);
                  }}
                  aria-haspopup="dialog"
                  aria-label={`${stage.title}: ${summary.done}/${summary.total} bài hoàn thành`}
                  className={`relative grid size-[88px] place-items-center rounded-full shadow-md ring-offset-2 transition active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 motion-safe:hover:scale-105 ${tone.fill} ${isCurrent ? "motion-safe:animate-pulse" : ""}`}
                >
                  <Ring percent={summary.percent} state={summary.state} />
                  <span className="text-3xl" aria-hidden>{summary.state === "done" ? "✅" : stage.icon}</span>
                  {(stage.tests?.length ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-w-6 place-items-center rounded-full bg-sky-600 px-1.5 text-[11px] font-bold leading-6 text-white shadow" aria-hidden title="Có bài kiểm tra">
                      📝{stage.tests!.length}
                    </span>
                  )}
                </button>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{stage.tag}</p>
                <p className="max-w-[11rem] text-center text-sm font-bold leading-tight text-stone-900">{stage.title}</p>
                <p className={`text-xs ${tone.text}`}>{summary.total ? `${summary.done}/${summary.total} bài` : `${stage.items.length} bài`}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {openView && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <button type="button" aria-label="Đóng" tabIndex={-1} onClick={close} className="absolute inset-0 bg-black/50" />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={openView.stage.title}
            className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl motion-safe:animate-[sheet-up_.2s_ease-out] sm:rounded-3xl"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" aria-hidden />
            <header className="flex items-start gap-3 px-5 pb-3 pt-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-stone-100 text-2xl" aria-hidden>{openView.stage.icon}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight text-stone-900">{openView.stage.title}</h2>
                <p className="text-sm text-stone-500">{openView.stage.blurb}</p>
              </div>
              <button type="button" autoFocus onClick={close} aria-label="Đóng" className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-stone-500 hover:bg-stone-100">×</button>
            </header>
            {openView.summary.total > 0 && (
              <div className="px-5 pb-3">
                <div className="h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-valuenow={openView.summary.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ chặng">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${openView.summary.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-stone-500">{openView.summary.done}/{openView.summary.total} bài hoàn thành</p>
              </div>
            )}
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {interleave(openView.stage.items, openView.stage.tests ?? []).map((row) => {
                if (row.kind === "test") {
                  const t = row.test;
                  const best = hydrated && t.trackEn ? bestAttempt(en, t.id) : undefined;
                  return (
                    <li key={t.id}>
                      <Link href={t.href} className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 p-3 hover:border-sky-500">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${best?.passed ? "bg-emerald-600 text-white" : "bg-sky-600 text-white"}`} aria-hidden>{best?.passed ? "✓" : t.kind === "final" ? "🏁" : "📝"}</span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold uppercase tracking-wide text-sky-700">{t.kind === "final" ? "Bài đầu ra" : "Kiểm tra"}</span>
                          <span className="block font-semibold leading-snug text-stone-900">{t.title}</span>
                          <span className="block text-xs text-stone-500">
                            {t.meta}
                            {best ? ` · tốt nhất ${best.percent}%${best.passed ? " (đạt)" : ""}` : t.trackEn ? " · chưa làm" : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                }
                const it = row.item;
                const st = openView.states[row.index]!;
                return (
                  <li key={it.slug}>
                    <Link href={it.href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200 p-3 hover:border-orange-300 hover:bg-orange-50/40">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${MARK_STYLE[st]}`} aria-label={st === "done" ? "Đã xong" : st === "doing" ? "Đang học" : "Chưa học"}>{MARK[st]}</span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-stone-400">{it.label}</span>
                        <span className="block font-semibold leading-snug text-stone-900">{it.title}</span>
                        {it.sub && <span className="block truncate text-xs text-stone-500">{it.sub}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {nextTarget && (
              <div className="border-t border-stone-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Link href={nextTarget.href} className="block rounded-2xl bg-orange-600 py-3 text-center font-bold text-white shadow-sm hover:bg-orange-700">
                  {nextTarget.label}
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
