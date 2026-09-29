"use client";
import { useEffect, useRef, useState } from "react";
import { Say, speakEnglish, useEnglishVoice } from "./speech";

type Line = { speaker: string; text: string; vi: string };

/** Dialogue with "play all", Vietnamese on/off, and role-play mode that hides one speaker's lines. */
export function DialoguePlayer({ title, lines }: { title: string; lines: Line[] }) {
  const voice = useEnglishVoice();
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const [showVi, setShowVi] = useState(true);
  const [hide, setHide] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState<number | null>(null);
  const stopRef = useRef(false);

  useEffect(() => () => void (stopRef.current = true), []);

  const playFrom = (i: number) => {
    if (i >= lines.length || stopRef.current) return setPlaying(null);
    setPlaying(i);
    speakEnglish(lines[i]!.text, 0.95, () => window.setTimeout(() => playFrom(i + 1), 350));
  };
  const toggleAll = () => {
    if (playing !== null) {
      stopRef.current = true;
      window.speechSynthesis.cancel();
      setPlaying(null);
    } else {
      stopRef.current = false;
      playFrom(0);
    }
  };

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"}`;

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-stone-900">{title}</h2>
        {voice !== "unavailable" && (
          <button type="button" onClick={toggleAll} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
            {playing !== null ? "■ Dừng" : "▶ Nghe cả bài"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(showVi)} onClick={() => setShowVi((v) => !v)}>
          Tiếng Việt: {showVi ? "hiện" : "ẩn"}
        </button>
        {speakers.map((s) => (
          <button
            key={s}
            type="button"
            className={chip(hide === s)}
            onClick={() => {
              setHide((h) => (h === s ? null : s));
              setRevealed(new Set());
            }}
          >
            Nhập vai {s}
          </button>
        ))}
      </div>
      {hide && <p className="text-sm text-stone-500">Bạn đóng vai {hide}: tự nói câu của {hide} trước, rồi bấm vào ô để xem đáp án.</p>}
      <ol className="space-y-3">
        {lines.map((l, i) => {
          const hidden = hide === l.speaker && !revealed.has(i);
          const right = speakers.indexOf(l.speaker) % 2 === 1;
          return (
            <li key={i} className={`flex gap-3 ${right ? "flex-row-reverse text-right" : ""}`}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${right ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
                {l.speaker}
              </span>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${playing === i ? "bg-sky-50 ring-2 ring-sky-300" : "bg-stone-50"}`}>
                {hidden ? (
                  <button type="button" onClick={() => setRevealed((r) => new Set(r).add(i))} className="text-left text-stone-400 italic">
                    (Lượt của bạn — bấm để xem)
                  </button>
                ) : (
                  <p lang="en" className="text-stone-900">
                    {l.text} <Say text={l.text} className="ml-1 align-middle" />
                  </p>
                )}
                {showVi && <p className="mt-1 text-sm text-stone-500">{l.vi}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
