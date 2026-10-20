"use client";
/**
 * "Âm của tôi": every English sound as a tile coloured by how well it went in the learner's pronunciation checks. Tap a
 * sound for the Vietnamese tip and minimal pairs (think / sink, ship / sheep …) to hear and practise.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { findMinimalPairs, masteryOf, MIN_TRIES, pairsFor, percentOfPhone, weakestPhones, type Mastery, type MinimalPair } from "@/domain/phone-stats";
import { PHONE_GROUPS, TIPS, type IpaDictionary } from "@/domain/pron-report";
import { loadIpa } from "./ipa";
import { PronounceCheck } from "./PronounceCheck";
import { usePhoneStats } from "./phone-store";
import { speakEnglish } from "./speech";

const TONE: Record<Mastery, string> = {
  new: "bg-stone-100 text-stone-500 ring-stone-200",
  weak: "bg-red-50 text-red-700 ring-red-200",
  ok: "bg-amber-50 text-amber-800 ring-amber-200",
  strong: "bg-jade-50 text-jade-700 ring-jade-100",
};
const LABEL: Record<Mastery, string> = { new: "Chưa đủ dữ liệu", weak: "Cần luyện", ok: "Gần đúng", strong: "Tốt" };

function SoundSheet({ sound, pairs, entry, onClose }: { sound: string; pairs: MinimalPair[]; entry: ReturnType<typeof usePhoneStats>[0]["phones"][string] | undefined; onClose: () => void }) {
  const [say, setSay] = useState<string | null>(null);
  const tip = TIPS[sound];
  const m = masteryOf(entry);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Đóng" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/50" />
      <section role="dialog" aria-modal="true" aria-label={`Âm ${sound}`} className="relative max-h-[88vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-300 sm:hidden" aria-hidden />
        <header className="flex items-start gap-3">
          <span className="font-mono text-5xl font-extrabold text-stone-900">/{sound}/</span>
          <div className="min-w-0 flex-1">
            <span className={`inline-block rounded-full px-3 py-0.5 text-sm font-bold ring-1 ring-inset ${TONE[m]}`}>{LABEL[m]}{entry && entry.tries >= MIN_TRIES ? ` · ${percentOfPhone(entry)}%` : ""}</span>
            <p className="mt-1 text-sm text-stone-500">{entry ? `${entry.right}/${entry.tries} lần đọc đúng` : "Bạn chưa luyện âm này."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-10 place-items-center rounded-full text-xl text-stone-500 hover:bg-stone-100">×</button>
        </header>
        {tip && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
            💡 <strong>{tip.say}</strong>. {tip.how}
          </p>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold text-stone-900">Cặp từ để luyện phân biệt</p>
          {pairs.length === 0 ? (
            <p className="text-sm text-stone-500">Chưa có cặp từ nào cho âm này trong từ điển của app.</p>
          ) : (
            <ul className="space-y-2">
              {pairs.map((p) => (
                <li key={`${p.a}-${p.b}`} className="rounded-xl bg-stone-50 p-3">
                  <div className="flex items-center gap-2">
                    {[p.a, p.b].map((w, i) => (
                      <button key={w} type="button" onClick={() => speakEnglish(w, 0.7)} className="flex-1 rounded-xl bg-white px-3 py-2 text-left ring-1 ring-stone-200 hover:ring-sky-300" aria-label={`Nghe ${w}`}>
                        <span lang="en" className="block text-lg font-bold text-stone-900">🔊 {w}</span>
                        <span className="font-mono text-xs text-stone-500">/{i === 0 ? p.soundA : p.soundB}/</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2 text-sm">
                    {[p.a, p.b].map((w) => (
                      <button key={w} type="button" onClick={() => setSay(say === w ? null : w)} aria-expanded={say === w} className="flex-1 rounded-lg px-2 py-1 font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50">
                        🎤 Đọc “{w}”
                      </button>
                    ))}
                  </div>
                  {(say === p.a || say === p.b) && <PronounceCheck text={say} nested />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function PhoneBoard() {
  const [stats, hydrated] = usePhoneStats();
  const [dict, setDict] = useState<IpaDictionary | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void loadIpa().then((d) => live && setDict(d));
    return () => {
      live = false;
    };
  }, []);
  const pairs = useMemo(() => (dict ? findMinimalPairs(dict) : []), [dict]);
  const weak = hydrated ? weakestPhones(stats, 5) : [];
  const practised = hydrated ? Object.values(stats.phones).filter((e) => e.tries >= MIN_TRIES).length : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-rose-600 to-fuchsia-700 p-5 text-white shadow-md">
        <h2 className="text-xl font-extrabold">Âm cần luyện hôm nay</h2>
        {weak.length > 0 ? (
          <>
            <p className="mt-1 text-white/85">Những âm bạn hay đọc sai nhất — chạm vào để xem mẹo và luyện cặp từ.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {weak.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => setOpen(s)} className="rounded-2xl bg-white px-4 py-2 font-mono text-xl font-extrabold text-rose-700 shadow hover:bg-rose-50">/{s}/</button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-white/85">{practised === 0 ? "Hãy chấm phát âm vài câu ở trang Luyện nói — app sẽ ghi lại âm nào bạn đọc đúng, âm nào sai." : "Không có âm nào dưới 85% — rất tốt! Tiếp tục luyện để giữ phong độ."}</p>
        )}
      </section>

      {PHONE_GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 text-lg font-bold text-stone-900">{g.title}</h2>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {g.sounds.map((s) => {
              const e = hydrated ? stats.phones[s] : undefined;
              const m = masteryOf(e);
              return (
                <li key={s}>
                  <button type="button" onClick={() => setOpen(s)} aria-label={`Âm ${s}: ${LABEL[m]}`} className={`flex h-20 w-full flex-col items-center justify-center rounded-2xl ring-1 ring-inset transition active:scale-95 ${TONE[m]}`}>
                    <span className="font-mono text-2xl font-extrabold">{s}</span>
                    <span className="text-[11px] font-semibold">{m === "new" ? "–" : `${percentOfPhone(e)}%`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="text-xs text-stone-500">
        Màu tô theo tỉ lệ đọc đúng của từng âm trong các lần chấm của bạn (cần ít nhất {MIN_TRIES} lần). Xanh từ 85%, vàng từ 60%, đỏ dưới 60%. Dữ liệu lưu trên trình duyệt này.
      </p>

      {open && <SoundSheet sound={open} pairs={pairsFor(pairs, open)} entry={hydrated ? stats.phones[open] : undefined} onClose={() => setOpen(null)} />}
    </div>
  );
}
