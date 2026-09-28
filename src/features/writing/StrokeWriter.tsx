"use client";
/**
 * Stroke-order guide and writing practice for one character, built on the
 * hanzi-writer library (MIT) with self-hosted hanzi-writer-data (Arphic PL).
 * Stroke data is loaded through src/lib/storage-url.ts, never from a CDN.
 */
import type HanziWriter from "hanzi-writer";
import { useCallback, useEffect, useRef, useState } from "react";
import { strokeLoader, WRITER_COLORS, WritingGrid } from "./shared";

type Mode = "idle" | "demo" | "step" | "practice" | "done";

export function StrokeWriter({ hanzi, strokeKey, size = 240 }: { hanzi: string; strokeKey: string | null; size?: number }) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<Mode>("idle");
  const [stroke, setStroke] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastWrong, setLastWrong] = useState(false);

  useEffect(() => {
    if (!strokeKey || !target.current) return;
    let cancelled = false;
    const el = target.current;
    el.innerHTML = "";
    setReady(false);
    setFailed(false);
    setMode("idle");

    import("hanzi-writer").then(({ default: HW }) => {
      if (cancelled) return;
      const w = HW.create(el, hanzi, {
        width: size,
        height: size,
        padding: 8,
        showOutline: true,
        showCharacter: true,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 250,
        ...WRITER_COLORS,
        charDataLoader: strokeLoader(strokeKey),
        onLoadCharDataSuccess: (data) => {
          if (cancelled) return;
          setTotal(data.strokes.length);
          setReady(true);
        },
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
      writer.current = w;
    });

    return () => {
      cancelled = true;
      writer.current?.cancelQuiz();
      writer.current = null;
    };
  }, [hanzi, strokeKey, size]);

  const demo = useCallback(() => {
    const w = writer.current;
    if (!w) return;
    w.cancelQuiz();
    setMode("demo");
    w.animateCharacter({ onComplete: () => setMode((m) => (m === "demo" ? "idle" : m)) });
  }, []);

  const nextStroke = useCallback(async () => {
    const w = writer.current;
    if (!w) return;
    w.cancelQuiz();
    let n = stroke;
    if (mode !== "step" || stroke >= total) {
      await w.hideCharacter({ duration: 0 });
      n = 0;
    }
    setMode("step");
    setStroke(n + 1);
    w.animateStroke(n);
  }, [mode, stroke, total]);

  const practice = useCallback(() => {
    const w = writer.current;
    if (!w) return;
    setMode("practice");
    setStroke(0);
    setMistakes(0);
    setLastWrong(false);
    w.quiz({
      showHintAfterMisses: 2,
      leniency: 1.2,
      onCorrectStroke: (d) => {
        setLastWrong(false);
        setStroke(d.strokeNum + 1);
      },
      onMistake: (d) => {
        setLastWrong(true);
        setMistakes(d.totalMistakes);
      },
      onComplete: ({ totalMistakes }) => {
        setMistakes(totalMistakes);
        setMode("done");
      },
    });
  }, []);

  const reset = useCallback(() => {
    const w = writer.current;
    if (!w) return;
    w.cancelQuiz();
    w.showCharacter();
    setMode("idle");
    setStroke(0);
  }, []);

  if (!strokeKey || failed) {
    return (
      <div className="grid place-items-center rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500" style={{ minHeight: size / 2 }}>
        Chưa có dữ liệu thứ tự nét cho chữ <span lang="zh-CN" className="font-han text-lg text-stone-800">{hanzi}</span>.
      </div>
    );
  }

  let status = total ? `${total} nét` : "Đang tải…";
  if (mode === "step") status = `Nét ${stroke}/${total}`;
  if (mode === "practice") status = lastWrong ? `Chưa đúng — thử lại nét ${stroke + 1}` : `Hãy viết nét ${stroke + 1}/${total}`;
  if (mode === "done") status = mistakes === 0 ? "Tuyệt vời! Viết đúng hết các nét." : `Hoàn thành! Sai ${mistakes} lần.`;

  const btn = "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors disabled:opacity-40";
  const primary = `${btn} bg-brand-600 text-white ring-brand-600 hover:bg-brand-700`;
  const secondary = `${btn} bg-white text-stone-700 ring-stone-300 hover:bg-stone-100`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-lg bg-white" style={{ width: size, height: size, touchAction: "none" }}>
        <WritingGrid />
        <div ref={target} className="relative" aria-label={`Khung viết chữ ${hanzi}`} role="img" />
      </div>
      <p
        aria-live="polite"
        className={`min-h-5 text-sm font-medium ${mode === "done" ? "text-jade-700" : lastWrong && mode === "practice" ? "text-brand-700" : "text-stone-600"}`}
      >
        {status}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={secondary} onClick={demo} disabled={!ready}>
          ▶ Xem viết mẫu
        </button>
        <button type="button" className={secondary} onClick={nextStroke} disabled={!ready}>
          {mode === "step" && stroke < total ? "Nét tiếp ›" : "Từng nét ›"}
        </button>
        {mode === "practice" || mode === "done" ? (
          <button type="button" className={secondary} onClick={reset}>
            ↺ Làm lại
          </button>
        ) : null}
        <button type="button" className={primary} onClick={practice} disabled={!ready}>
          ✍ {mode === "done" ? "Viết lại" : "Tự viết thử"}
        </button>
      </div>
      {mode === "practice" && <p className="text-center text-xs text-stone-500">Dùng chuột hoặc ngón tay viết lần lượt từng nét vào ô. Sai 2 lần sẽ có gợi ý.</p>}
    </div>
  );
}
