"use client";
/**
 * Listening modes for the example-sentence step (docs/LISTENING_PLAN.md §2.1).
 * Sentence cards stay server-rendered: this component only sets `data-hide` on
 * the list; globals.css hides the matching `data-part` of each sentence that is
 * not revealed. The chosen mode is a per-viewer convenience in localStorage.
 */
import { useEffect, useState } from "react";
import { listeningSummary } from "@/domain/progress";
import { LISTEN_MODES, parseListenMode, type ListenMode } from "@/domain/listening";
import { useProgress } from "@/features/progress/store";

const STORAGE_KEY = "chinese-app:listen-mode";
export const MODE_EVENT = "chinese-app:listen-mode";

export function ListeningModes({ listId, sentenceKeys }: { listId: string; sentenceKeys: string[] }) {
  const [mode, setMode] = useState<ListenMode>("all");
  const [state, , hydrated] = useProgress();
  const summary = listeningSummary(state, sentenceKeys);

  useEffect(() => {
    try {
      setMode(parseListenMode(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      // storage unavailable: keep "all"
    }
  }, []);

  useEffect(() => {
    const list = document.getElementById(listId);
    if (!list) return;
    list.dataset.hide = mode;
    list.querySelectorAll("[data-revealed]").forEach((el) => el.removeAttribute("data-revealed"));
    window.dispatchEvent(new CustomEvent(MODE_EVENT));
  }, [listId, mode]);

  const choose = (m: ListenMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // ignore
    }
  };

  const current = LISTEN_MODES.find((m) => m.id === mode)!;
  return (
    <div className="mb-4 space-y-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Chế độ nghe" className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1 text-sm">
          {LISTEN_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => choose(m.id)}
              className={`rounded-lg px-3 py-1.5 font-medium ${mode === m.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className={`text-sm text-stone-500 transition-opacity ${hydrated ? "opacity-100" : "opacity-0"}`} aria-live="polite">
          Đã nghe <strong className="text-stone-900">{summary.listened}</strong>/{summary.total} câu
        </p>
      </div>
      <p className="text-xs text-stone-500">{current.hint}</p>
    </div>
  );
}

/** "Hiện / Ẩn" for one sentence while a hiding mode is active (hidden in "Xem đủ" by CSS). */
export function RevealButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reset = () => setOpen(false);
    window.addEventListener(MODE_EVENT, reset);
    return () => window.removeEventListener(MODE_EVENT, reset);
  }, []);
  return (
    <button
      type="button"
      data-reveal-btn
      aria-pressed={open}
      onClick={(e) => {
        const card = e.currentTarget.closest("[data-sentence]");
        if (!card) return;
        const next = !open;
        if (next) card.setAttribute("data-revealed", "true");
        else card.removeAttribute("data-revealed");
        setOpen(next);
      }}
      className="rounded-lg px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100"
    >
      {open ? "Ẩn lại" : "Hiện"}
    </button>
  );
}

/** ✓ when the sentence has been listened to the end at least once. */
export function ListenedMark({ sentenceKey }: { sentenceKey: string }) {
  const [state, , hydrated] = useProgress();
  const plays = state.listening?.[sentenceKey]?.plays ?? 0;
  if (!hydrated || plays === 0) return null;
  return (
    <span className="text-xs font-medium text-jade-700" title={`Đã nghe ${plays} lần`}>
      ✓ đã nghe
    </span>
  );
}
