"use client";
/**
 * Flashcard deck: flip a card, answer "Chưa nhớ" / "Nhớ rồi". Answers move the
 * word between Leitner boxes (src/domain/progress.ts) so due words come back
 * later; forgotten cards return at the end of the current session.
 */
import { useEffect, useState } from "react";
import { isDue, MAX_BOX, reviewCard, toggleSaved } from "@/domain/progress";
import { shuffle } from "@/domain/exercises";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { ProgressBar } from "@/features/progress/ProgressWidgets";
import { useProgress } from "@/features/progress/store";
import type { FlashWord } from "./data";

type Filter = "due" | "all" | "saved";
type Front = "hanzi" | "meaning";

export function SaveWordButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [state, update, hydrated] = useProgress();
  const saved = hydrated && Boolean(state.saved?.[slug]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        update((s) => toggleSaved(s, slug, !saved));
      }}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors ${
        saved ? "bg-amber-50 text-amber-800 ring-amber-300" : "bg-white text-stone-600 ring-stone-300 hover:bg-stone-100"
      }`}
    >
      <span aria-hidden="true">{saved ? "★" : "☆"}</span>
      {compact ? <span className="sr-only">{saved ? "Bỏ khỏi Sổ từ" : "Lưu vào Sổ từ"}</span> : saved ? "Đã lưu" : "Lưu vào Sổ từ"}
    </button>
  );
}

function Card({ word, front, flipped, onFlip }: { word: FlashWord; front: Front; flipped: boolean; onFlip: () => void }) {
  const hanzi = (
    <div className="text-center">
      <p lang="zh-CN" className="font-han text-7xl leading-tight text-stone-900 sm:text-8xl">{word.simplified}</p>
    </div>
  );
  const meaning = <p className="text-center text-2xl font-medium text-stone-800">{word.meanings.join("; ") || "chưa có nghĩa tiếng Việt"}</p>;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter") onFlip();
      }}
      aria-label={flipped ? "Mặt sau của thẻ" : "Bấm để lật thẻ"}
      className="flex min-h-72 cursor-pointer flex-col justify-center gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-md transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {front === "hanzi" ? hanzi : meaning}
      {!flipped ? (
        <p className="text-center text-sm text-stone-400">Nhớ nghĩa{front === "meaning" ? " → chữ Hán" : ""} rồi bấm để lật thẻ (phím Space)</p>
      ) : (
        <div className="space-y-3 border-t border-stone-100 pt-4 text-center">
          {front === "meaning" && hanzi}
          <p className="flex items-center justify-center gap-2 text-2xl font-medium text-brand-700">
            {word.pinyin}
            <span onClick={(e) => e.stopPropagation()}>
              <SpeakButtons text={word.simplified} compact />
            </span>
          </p>
          {word.sinoViet && <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">Hán Việt: {word.sinoViet}</p>}
          {front === "hanzi" && meaning}
          {word.example && (
            <div className="mx-auto max-w-md rounded-xl bg-stone-50 p-3 text-left" onClick={(e) => e.stopPropagation()}>
              <p lang="zh-CN" className="font-han text-lg text-stone-900">{word.example.simplified}</p>
              {word.example.pinyin && <p className="text-sm text-brand-700">{word.example.pinyin}</p>}
              {word.example.vi && <p className="text-sm text-stone-600">{word.example.vi}</p>}
              <div className="mt-2">
                <AudioButtons audio={word.example.audio} durations={word.example.audioMs} compact />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Flashcards({ words, emptyHint, savedFilter = true }: { words: FlashWord[]; emptyHint?: string; savedFilter?: boolean }) {
  const [state, update, hydrated] = useProgress();
  const [filter, setFilter] = useState<Filter>("due");
  const [front, setFront] = useState<Front>("hanzi");
  const [queue, setQueue] = useState<FlashWord[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState({ remembered: 0, forgot: 0 });

  const pool = (f: Filter) => words.filter((w) => (f === "all" ? true : f === "saved" ? state.saved?.[w.slug] : isDue(state, w.slug)));
  const counts = { due: pool("due").length, all: words.length, saved: pool("saved").length };

  const start = (f = filter) => {
    setQueue(shuffle(pool(f), Math.random));
    setFlipped(false);
    setDone({ remembered: 0, forgot: 0 });
  };

  const current = queue?.[0];
  const answer = (remembered: boolean) => {
    if (!current || !flipped) return;
    update((s) => reviewCard(s, current.slug, remembered));
    setDone((d) => (remembered ? { ...d, remembered: d.remembered + 1 } : { ...d, forgot: d.forgot + 1 }));
    // A forgotten card goes to the back of the queue so it comes up again this session.
    setQueue((q) => (q ? (remembered ? q.slice(1) : [...q.slice(1), q[0]!]) : q));
    setFlipped(false);
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!queue) {
    const tab = (f: Filter, label: string) => (
      <button
        key={f}
        type="button"
        onClick={() => setFilter(f)}
        aria-pressed={filter === f}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`}
      >
        {label} <span className="text-stone-400">({hydrated ? counts[f] : "…"})</span>
      </button>
    );
    const disabled = !hydrated || counts[filter] === 0;
    return (
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Ôn những thẻ nào?</p>
          <div className="flex w-fit flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
            {tab("due", "Cần ôn")}
            {tab("all", "Tất cả")}
            {savedFilter && tab("saved", "★ Đã lưu")}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Mặt trước của thẻ</p>
          <div className="flex w-fit gap-1 rounded-xl bg-stone-100 p-1 text-sm">
            {(["hanzi", "meaning"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFront(f)} aria-pressed={front === f} className={`rounded-lg px-3 py-1.5 font-medium ${front === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>
                {f === "hanzi" ? "Chữ Hán → nghĩa" : "Nghĩa → chữ Hán"}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => start()} disabled={disabled} className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
          Bắt đầu ôn
        </button>
        {hydrated && counts[filter] === 0 && (
          <p className="text-sm text-stone-500">
            {filter === "due" ? "Không còn thẻ nào cần ôn lúc này — giỏi lắm! Chọn “Tất cả” để ôn thêm." : filter === "saved" ? (emptyHint ?? "Chưa lưu từ nào. Bấm ☆ trên thẻ để lưu từ khó.") : "Không có từ nào."}
          </p>
        )}
        <p className="text-xs text-stone-500">“Nhớ rồi” → thẻ được hẹn ôn lại sau 1, 3, 7, 16 ngày. “Chưa nhớ” → thẻ quay lại ngay trong lượt này.</p>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-jade-100 bg-jade-50 p-6 text-center" role="status">
        <p className="text-sm text-jade-700">Xong lượt ôn</p>
        <p className="mt-1 text-lg font-medium text-stone-800">
          Nhớ ngay: <strong>{done.remembered}</strong> · Phải ôn lại: <strong>{done.forgot}</strong> lần
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setQueue(null)} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Ôn lượt khác
          </button>
        </div>
      </div>
    );
  }

  const reviewed = done.remembered + done.forgot;
  const box = state.cards?.[current.slug]?.box;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-stone-500">
          <span>Còn {queue.length} thẻ</span>
          <span>{box ? `Hộp ${box}/${MAX_BOX}` : "Thẻ mới"}</span>
        </div>
        <ProgressBar percent={Math.round((done.remembered / (done.remembered + queue.length)) * 100)} label="Tiến độ ôn thẻ" />
      </div>
      <Card key={`${current.slug}-${reviewed}`} word={current} front={front} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SaveWordButton slug={current.slug} />
        {flipped ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => answer(false)} className="rounded-xl bg-white px-5 py-2.5 font-semibold text-brand-700 ring-1 ring-inset ring-brand-300 hover:bg-brand-50">
              ✗ Chưa nhớ <span className="hidden text-xs font-normal text-stone-400 sm:inline">(1)</span>
            </button>
            <button type="button" onClick={() => answer(true)} className="rounded-xl bg-jade-600 px-5 py-2.5 font-semibold text-white hover:bg-jade-700">
              ✓ Nhớ rồi <span className="hidden text-xs font-normal text-jade-100 sm:inline">(2)</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-700">
            Lật thẻ
          </button>
        )}
      </div>
      <div className="text-right">
        <button type="button" onClick={() => setQueue(null)} className="text-sm text-stone-500 hover:text-stone-800 hover:underline">
          Dừng lượt ôn
        </button>
      </div>
    </div>
  );
}
