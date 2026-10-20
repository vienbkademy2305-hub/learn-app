"use client";
/**
 * ELSA-style result of a pronunciation check (docs/ELSA_PRONUNCIATION_PLAN.md): overall % ring, every word coloured with its own %,
 * a list of the words to practise, and a bottom sheet per word with the sounds, what was heard instead, a Vietnamese tip, the model
 * voice, the learner's own recording and a retry. One component for both sources (phone: browser recognition; computer: server).
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { levelOf, weakWords, type Level, type Report, type WordReport } from "@/domain/pron-report";
import { speakEnglish } from "./speech";

const TONE: Record<Level, { word: string; chip: string; bar: string; label: string }> = {
  good: { word: "bg-jade-50 text-jade-700 ring-jade-100", chip: "bg-jade-600 text-white", bar: "bg-jade-600", label: "Đúng" },
  ok: { word: "bg-amber-50 text-amber-800 ring-amber-200", chip: "bg-amber-500 text-white", bar: "bg-amber-500", label: "Gần đúng" },
  bad: { word: "bg-red-50 text-red-700 ring-red-200", chip: "bg-red-600 text-white", bar: "bg-red-500", label: "Cần luyện" },
};
const RING: Record<Level, string> = { good: "#1f8a5b", ok: "#f59e0b", bad: "#dc2626" };

function Ring({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Phát âm ${percent} phần trăm`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" stroke="#e7e5e4" />
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" strokeLinecap="round" stroke={RING[levelOf(percent)]} strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-3xl font-extrabold text-stone-900">
        {percent}
        <span className="-ml-3 mt-1 text-base font-bold">%</span>
      </span>
    </div>
  );
}

function PhoneChip({ expected, heard, ok, percent }: { expected: string; heard: string | null; ok: boolean; percent?: number }) {
  return (
    <li className={`flex min-w-12 flex-col items-center rounded-xl px-2 py-1.5 text-center ring-1 ring-inset ${ok ? "bg-jade-50 text-jade-700 ring-jade-100" : "bg-red-50 text-red-700 ring-red-200"}`}>
      <span className="font-mono text-lg font-bold">{expected}</span>
      {!ok && <span className="font-mono text-xs">{heard ? `→ ${heard}` : "bỏ mất"}</span>}
      {percent !== undefined && <span className="text-[10px] text-stone-500">{percent}%</span>}
    </li>
  );
}

function WordSheet({ w, mineUrl, retry, onClose }: { w: WordReport; mineUrl: string | null; retry?: (word: string) => ReactNode; onClose: () => void }) {
  const level: Level = w.status === "missed" ? "bad" : levelOf(w.percent);
  const clean = w.word.replace(/[^A-Za-z'-]/g, "");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Đóng" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <section role="dialog" aria-modal="true" aria-label={`Phát âm từ ${clean}`} className="relative max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" aria-hidden />
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p lang="en" className="text-3xl font-extrabold text-stone-900">{clean || w.word}</p>
            <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-bold ${TONE[level].chip}`}>{w.status === "missed" ? "Chưa nghe thấy" : TONE[level].label} · {w.percent}%</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-10 place-items-center rounded-full text-xl text-stone-500 hover:bg-stone-100">×</button>
        </header>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="rounded-xl bg-jade-50 p-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-jade-700">Cần đọc</span>
            <span className="font-mono text-base text-stone-900">{w.ipa ?? clean}</span>
          </p>
          <p className="rounded-xl bg-red-50 p-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-red-700">Máy nghe thấy</span>
            <span lang="en" className="font-mono text-base text-stone-900">{w.heard ? `${w.heard}${w.heardIpa ? ` ${w.heardIpa}` : ""}` : "(không nghe thấy)"}</span>
          </p>
        </div>

        {w.phones && w.phones.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold text-stone-900">Từng âm</p>
            <ul className="flex flex-wrap gap-1.5">{w.phones.map((p, i) => <PhoneChip key={i} {...p} />)}</ul>
          </div>
        )}

        {w.tip && <p className="rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">💡 {w.tip}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => speakEnglish(clean || w.word, 0.6)} className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">🔊 Nghe mẫu chậm</button>
          <button type="button" onClick={() => speakEnglish(clean || w.word, 0.95)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-800 ring-1 ring-inset ring-sky-300 hover:bg-sky-50">🔊 Nghe mẫu</button>
        </div>
        {mineUrl && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Bản ghi của bạn (cả câu)</p>
            <audio src={mineUrl} controls className="h-9 w-full" />
          </div>
        )}
        {retry && (
          <div>
            <p className="mb-1 text-sm font-semibold text-stone-900">Đọc lại riêng từ này</p>
            {retry(clean || w.word)}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

export function PronounceReport({ report, mineUrl, retry }: { report: Report; mineUrl: string | null; retry?: (word: string) => ReactNode }) {
  const [open, setOpen] = useState<WordReport | null>(null);
  const weak = weakWords(report);
  const level = levelOf(report.overall);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Ring percent={report.overall} />
        <div>
          <p className="text-xl font-extrabold text-stone-900">{report.label}</p>
          <p className="text-sm text-stone-600">
            {weak.length === 0 ? "Tất cả các từ đều đúng. 🎉" : `${report.words.length - weak.length}/${report.words.length} từ đúng · ${weak.length} từ cần luyện`}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[level].chip}`}>{report.source === "server" ? "Chấm từng âm" : "Chấm theo giọng nhận dạng"}</span>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Chạm vào từ để xem chi tiết</p>
        <ul lang="en" className="flex flex-wrap gap-x-1.5 gap-y-2 text-lg leading-none">
          {report.words.map((w, i) => {
            const l: Level = w.status === "missed" ? "bad" : levelOf(w.percent);
            return (
              <li key={i}>
                <button type="button" onClick={() => setOpen(w)} className={`flex flex-col items-center rounded-lg px-2 py-1 ring-1 ring-inset transition active:scale-95 ${TONE[l].word} ${w.status === "missed" ? "line-through decoration-2" : ""}`}>
                  <span className="font-semibold">{w.word}</span>
                  <span className="mt-0.5 font-sans text-[10px] font-bold no-underline">{w.percent}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {report.note && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">💡 {report.note}</p>}

      {weak.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-stone-900">Từ cần luyện (thấp nhất trước)</p>
          <ul className="space-y-2">
            {weak.map((w) => (
              <li key={w.word}>
                <button type="button" onClick={() => setOpen(w)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-stone-200 hover:ring-sky-300">
                  <span lang="en" className="w-24 shrink-0 truncate font-bold text-stone-900">{w.word}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"><span className={`block h-full rounded-full ${TONE[w.status === "missed" ? "bad" : levelOf(w.percent)].bar}`} style={{ width: `${Math.max(4, w.percent)}%` }} /></span>
                  <span className="w-10 shrink-0 text-right text-sm font-bold text-stone-700">{w.percent}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Máy nghe được: <span lang="en" className="font-mono">{report.heardText || "(không có)"}</span>
        {report.source === "browser" && " · Trên điện thoại, app dùng nhận dạng giọng nói của trình duyệt để tìm từ bạn đọc sai và so sánh âm của từ đó với từ máy nghe được. Muốn chấm chi tiết từng âm, dùng máy chấm trên máy tính."}
      </p>

      {open && <WordSheet w={open} mineUrl={mineUrl} retry={retry} onClose={() => setOpen(null)} />}
    </div>
  );
}
