"use client";
/**
 * Copybook practice (描红 → 临写 → 默写): each character is written three times
 * with less help each round — outline and early hints, then a faint outline,
 * then a blank grid.
 */
import type HanziWriter from "hanzi-writer";
import { useEffect, useRef, useState } from "react";
import type { LessonCharacter } from "@/domain/display";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { strokeLoader, WRITER_COLORS, WritingGrid } from "@/features/writing/shared";

const ROUNDS = [
  { label: "Tô theo nét mờ", outline: true, outlineColor: WRITER_COLORS.outlineColor, hintAfter: 1 },
  { label: "Nét mờ nhạt dần", outline: true, outlineColor: "#efeceb", hintAfter: 2 },
  { label: "Tự viết (không nét mờ)", outline: false, outlineColor: WRITER_COLORS.outlineColor, hintAfter: 3 },
] as const;
const SIZE = 240;

type RoundResult = { mistakes: number } | null;

function RoundWriter({ hanzi, strokeKey, round, onDone }: { hanzi: string; strokeKey: string; round: number; onDone: (mistakes: number) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [failed, setFailed] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let cancelled = false;
    el.innerHTML = "";
    const cfg = ROUNDS[round]!;
    import("hanzi-writer").then(({ default: HW }) => {
      if (cancelled) return;
      const w = HW.create(el, hanzi, {
        width: SIZE,
        height: SIZE,
        padding: 8,
        showCharacter: false,
        showOutline: cfg.outline,
        ...WRITER_COLORS,
        outlineColor: cfg.outlineColor,
        charDataLoader: strokeLoader(strokeKey),
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
      writer.current = w;
      w.quiz({ showHintAfterMisses: cfg.hintAfter, leniency: 1.2, onComplete: ({ totalMistakes }) => done.current(totalMistakes) });
    });
    return () => {
      cancelled = true;
      writer.current?.cancelQuiz();
    };
  }, [hanzi, strokeKey, round]);

  if (failed) return <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Không tải được dữ liệu nét chữ.</p>;
  return (
    <div className="relative mx-auto rounded-lg bg-white" style={{ width: SIZE, height: SIZE, touchAction: "none" }}>
      <WritingGrid />
      <div ref={target} className="relative" role="img" aria-label={`Khung chép chữ ${hanzi}, lượt ${round + 1}`} />
    </div>
  );
}

function CopyBoard({ char, onNext }: { char: LessonCharacter & { stroke: string }; onNext?: () => void }) {
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([null, null, null]);
  const [attempt, setAttempt] = useState(0);
  const current = results[round];
  const allDone = results.every(Boolean);

  const record = (mistakes: number) =>
    setResults((r) => {
      const next = [...r];
      next[round] = { mistakes };
      return next;
    });

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
        {ROUNDS.map((r, i) => {
          const res = results[i];
          return (
            <li key={r.label}>
              <button
                type="button"
                onClick={() => {
                  setRound(i);
                  setAttempt((a) => a + 1);
                }}
                aria-current={round === i ? "step" : undefined}
                className={`h-full w-full rounded-xl px-2 py-2 ring-1 ring-inset ${round === i ? "bg-stone-900 text-white ring-stone-900" : res ? "bg-jade-50 text-jade-700 ring-jade-600" : "bg-white text-stone-600 ring-stone-300"}`}
              >
                <span className="block font-semibold">Lượt {i + 1}</span>
                <span className="block">{r.label}</span>
                {res && <span className="block">{res.mistakes === 0 ? "✓ không sai" : `✓ sai ${res.mistakes}`}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <RoundWriter key={`${char.hanzi}-${round}-${attempt}`} hanzi={char.hanzi} strokeKey={char.stroke} round={round} onDone={record} />

      <p aria-live="polite" className="min-h-5 text-center text-sm font-medium text-stone-600">
        {current
          ? current.mistakes === 0
            ? "Tuyệt vời! Không sai nét nào."
            : `Xong lượt ${round + 1} — sai ${current.mistakes} lần.`
          : `Viết lần lượt từng nét. Sai ${ROUNDS[round]!.hintAfter} lần ở một nét sẽ có gợi ý.`}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {current && (
          <button
            type="button"
            onClick={() => {
              setResults((r) => r.map((x, i) => (i === round ? null : x)));
              setAttempt((a) => a + 1);
            }}
            className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
            ↺ Viết lại lượt này
          </button>
        )}
        {current && round < ROUNDS.length - 1 && (
          <button type="button" onClick={() => setRound((r) => r + 1)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Lượt {round + 2} →
          </button>
        )}
        {allDone && onNext && (
          <button type="button" onClick={onNext} className="rounded-xl bg-jade-600 px-4 py-2 text-sm font-semibold text-white hover:bg-jade-700">
            Chữ tiếp theo →
          </button>
        )}
      </div>
    </div>
  );
}

export function CopyPractice({ characters }: { characters: LessonCharacter[] }) {
  const writable = characters.filter((c): c is LessonCharacter & { stroke: string } => Boolean(c.stroke));
  const [index, setIndex] = useState(0);
  const current = writable[index];
  if (!current) return <p className="rounded-2xl bg-white p-6 text-center text-stone-500">Bài này chưa có dữ liệu nét chữ để tập chép.</p>;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="order-2 md:order-1">
        <p className="mb-2 text-sm text-stone-500">Chọn chữ để chép ({writable.length})</p>
        <ul className="flex flex-wrap gap-2">
          {writable.map((c, i) => (
            <li key={c.hanzi}>
              <button
                type="button"
                lang="zh-CN"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={`font-han grid size-12 place-items-center rounded-xl text-2xl ring-1 ring-inset transition-colors ${i === index ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-brand-300"}`}
              >
                {c.hanzi}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:order-2 md:w-96">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2">
            <span lang="zh-CN" className="font-han text-3xl">{current.hanzi}</span>
            <span className="text-brand-700">{current.pinyin ?? ""}</span>
            <SpeakButtons text={current.hanzi} compact />
          </p>
          {current.sinoViet[0] && <p className="text-sm font-semibold uppercase text-stone-700">{current.sinoViet[0]}</p>}
        </div>
        <CopyBoard key={current.hanzi} char={current} onNext={index < writable.length - 1 ? () => setIndex(index + 1) : undefined} />
      </div>
    </div>
  );
}
