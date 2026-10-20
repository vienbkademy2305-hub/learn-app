"use client";
/**
 * On-screen letter keyboard for the typed word games (docs/UI_POLISH_PLAN.md). Letters that occur in the answer get an
 * outline, like in the reference app. The phone's own keyboard is hidden (the input uses inputMode="none"), a physical
 * keyboard still types into the input as usual.
 */

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"] as const;

export function QuizKeyboard({ answer, disabled, onKey, onBackspace }: { answer: string; disabled?: boolean; onKey: (key: string) => void; onBackspace: () => void }) {
  const inAnswer = new Set(answer.toLowerCase());
  const key = "grid h-12 min-w-0 flex-1 place-items-center rounded-lg text-xl font-bold uppercase transition active:scale-95 disabled:opacity-40";
  return (
    <div className="space-y-2" role="group" aria-label="Bàn phím chữ cái">
      {ROWS.map((row, r) => (
        <div key={row} className={`flex gap-1.5 ${r === 1 ? "px-3" : ""}`}>
          {[...row].map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={disabled}
              onClick={() => onKey(ch)}
              className={`${key} ${inAnswer.has(ch) ? "bg-neutral-900 text-white ring-2 ring-neutral-500" : "bg-neutral-900 text-neutral-400"}`}
            >
              {ch}
            </button>
          ))}
          {r === 2 && (
            <button type="button" disabled={disabled} onClick={onBackspace} aria-label="Xóa chữ cuối" className={`${key} !flex-[1.5] bg-neutral-800 text-white ring-2 ring-neutral-600`}>
              ⌫
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-1.5 px-6">
        <button type="button" disabled={disabled} onClick={() => onKey(" ")} className={`${key} bg-neutral-900 text-sm normal-case text-neutral-400`}>
          dấu cách
        </button>
        <button type="button" disabled={disabled} onClick={() => onKey("-")} className={`${key} !flex-[0.4] bg-neutral-900 text-neutral-400`}>-</button>
        <button type="button" disabled={disabled} onClick={() => onKey("'")} className={`${key} !flex-[0.4] bg-neutral-900 text-neutral-400`}>&apos;</button>
      </div>
    </div>
  );
}
