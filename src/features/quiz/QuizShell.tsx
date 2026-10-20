"use client";
/**
 * QuizShell (docs/UI_POLISH_PLAN.md): the full-screen, one-question-at-a-time frame shared by the exercises —
 * yellow progress bar with a badge, big title, big rounded answer tiles, a fixed bottom bar with the exit button and a
 * pill "Tiếp theo" button that turns green (right) or red (wrong), and a colour feedback panel. Always dark, like a game.
 */
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type QuizState = "idle" | "ok" | "bad" | "disabled";

export function QuizShell({
  progress,
  badge,
  title,
  tag,
  top,
  footer,
  onExit,
  children,
}: {
  /** 0–1 */
  progress: number;
  /** number shown in the round badge (right correct answers so far) */
  badge?: number;
  title?: ReactNode;
  /** small purple chip above the title, e.g. "ĐÃ ĐẾN LÚC ĐỂ ÔN LẠI" */
  tag?: string;
  /** extra block under the progress bar (boss health, ✓/✗ counters …) */
  top?: ReactNode;
  /** content of the fixed bottom bar between the exit button and the right edge */
  footer?: ReactNode;
  onExit: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onExit]);

  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  // portal to <body>: a parent's `space-y-*` margin or transform would otherwise shrink the fixed frame
  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Bài luyện tập" className="quiz-dark fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col overflow-hidden px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ">
            <div className="h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          {badge !== undefined && (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-neutral-900 text-lg font-bold text-amber-300 ring-1 ring-neutral-700" aria-label={`${badge} câu đúng`}>
              {badge}
            </span>
          )}
        </div>
        {top && <div className="mt-3">{top}</div>}
        {(tag || title) && (
          <div className="mt-5">
            {tag && (
              <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-violet-400">
                <span className="grid size-6 place-items-center rounded-full bg-violet-500 text-white" aria-hidden>✦</span>
                {tag}
              </p>
            )}
            {title && <h2 className="text-3xl font-extrabold leading-tight">{title}</h2>}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-1 py-5">{children}</div>
      </div>
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <button type="button" onClick={onExit} aria-label="Thoát" className="grid size-16 shrink-0 place-items-center rounded-full bg-neutral-900 text-2xl text-white ring-1 ring-neutral-800 hover:bg-neutral-800">
          ✕
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

const BUTTON: Record<QuizState, string> = {
  idle: "bg-sky-500 text-white hover:bg-sky-400",
  ok: "bg-emerald-500 text-white hover:bg-emerald-400",
  bad: "bg-red-500 text-white hover:bg-red-400",
  disabled: "bg-neutral-900 text-neutral-500",
};

/** The big pill button of the bottom bar. */
export function QuizButton({ state = "idle", onClick, children, type = "button", buttonRef }: { state?: QuizState; onClick?: () => void; children: ReactNode; type?: "button" | "submit"; buttonRef?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={state === "disabled"}
      className={`h-16 min-w-0 flex-1 rounded-full px-6 text-xl font-extrabold transition-colors ${BUTTON[state]}`}
    >
      {children}
    </button>
  );
}

export type TileState = "idle" | "selected" | "right" | "wrong" | "done" | "dim";

const TILE: Record<TileState, string> = {
  idle: "bg-neutral-900 text-white hover:bg-neutral-800",
  selected: "bg-neutral-800 text-white ring-2 ring-sky-400",
  right: "bg-emerald-950 text-emerald-200 ring-2 ring-emerald-500",
  wrong: "bg-red-950 text-red-200 ring-2 ring-red-500",
  done: "bg-neutral-900 text-neutral-600",
  dim: "bg-neutral-900 text-neutral-500",
};

/** A big rounded answer tile. */
export function QuizTile({ state = "idle", onClick, disabled, children, outline = false, className = "" }: { state?: TileState; onClick?: () => void; disabled?: boolean; children: ReactNode; outline?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-16 w-full items-center justify-center rounded-2xl px-4 py-3 text-center text-lg leading-snug transition-colors ${outline && state === "idle" ? "bg-neutral-950 text-white ring-2 ring-neutral-700 hover:bg-neutral-900" : TILE[state]} ${className}`}
    >
      {children}
    </button>
  );
}

/** Green / red feedback panel ("Chính xác" / "Sai") with an explanation. */
export function FeedbackPanel({ ok, children }: { ok: boolean; children?: ReactNode }) {
  return (
    <div role="status" className={`rounded-3xl p-4 motion-safe:animate-[sheet-up_.2s_ease-out] ${ok ? "bg-emerald-950" : "bg-red-950"}`}>
      <p className={`text-2xl font-extrabold ${ok ? "text-emerald-400" : "text-red-400"}`}>{ok ? "Chính xác" : "Sai"}</p>
      {children && <div className="mt-2 rounded-2xl bg-black/60 p-3 text-lg leading-snug text-white">{children}</div>}
    </div>
  );
}
