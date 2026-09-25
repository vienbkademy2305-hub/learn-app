"use client";
/**
 * "Listen to the whole lesson": plays every sentence's recorded audio in order,
 * highlighting and scrolling to the sentence being read. Sentences are found
 * by `id="sentence-<key>"` on their list items.
 */
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/storage-url";

type Speed = "normal" | "slow";

export function PlayAll({ sentences }: { sentences: Array<{ key: string; audio: { normal?: string; slow?: string } }> }) {
  const playable = sentences.filter((s) => s.audio.normal || s.audio.slow);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [index, setIndex] = useState<number | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const gap = useRef<number | undefined>(undefined);

  const mark = (key: string | undefined, on: boolean) => {
    if (!key) return;
    const el = document.getElementById(`sentence-${key}`);
    if (!el) return;
    el.dataset.playing = on ? "true" : "false";
    if (on) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const stop = () => {
    window.clearTimeout(gap.current);
    player.current?.pause();
    player.current = null;
    setIndex((i) => {
      if (i !== null) mark(playable[i]?.key, false);
      return null;
    });
  };

  useEffect(() => () => {
    window.clearTimeout(gap.current);
    player.current?.pause();
  }, []);

  const playFrom = (i: number, chosen: Speed) => {
    const s = playable[i];
    if (!s) {
      stop();
      return;
    }
    const key = s.audio[chosen] ?? s.audio.normal ?? s.audio.slow!;
    if (i > 0) mark(playable[i - 1]?.key, false);
    mark(s.key, true);
    setIndex(i);
    const el = new Audio(assetUrl(key));
    player.current = el;
    el.onended = () => {
      // Short pause between sentences, like a listening exercise.
      gap.current = window.setTimeout(() => playFrom(i + 1, chosen), 700);
    };
    el.onerror = () => playFrom(i + 1, chosen);
    el.play().catch(() => stop());
  };

  if (playable.length === 0) return null;
  const playing = index !== null;

  return (
    <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-sm backdrop-blur">
      {playing ? (
        <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700">
          ■ Dừng
        </button>
      ) : (
        <button type="button" onClick={() => playFrom(0, speed)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          ▶ Nghe cả bài
        </button>
      )}
      <div className="flex rounded-xl bg-stone-100 p-0.5 text-sm" role="group" aria-label="Tốc độ đọc">
        {(["normal", "slow"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            disabled={playing}
            onClick={() => setSpeed(s)}
            className={`rounded-lg px-3 py-1.5 font-medium disabled:opacity-60 ${speed === s ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
          >
            {s === "normal" ? "Bình thường" : "Chậm"}
          </button>
        ))}
      </div>
      <span aria-live="polite" className="text-sm text-stone-500">
        {playing ? `Đang phát câu ${index + 1}/${playable.length}` : `${playable.length} câu`}
      </span>
    </div>
  );
}
