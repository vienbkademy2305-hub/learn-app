"use client";
/** "🔊 Giọng đọc trên máy này": lists the device's voices (most natural first) and remembers the pick. */
import { useEffect, useState } from "react";
import { deviceVoices, getBrowserVoicePick, isNaturalVoice, setBrowserVoicePick, type BrowserVoicePick, type VoiceLang } from "./browser-voices";

const ACCENT: Record<string, string> = {
  "en-GB": "Anh-Anh",
  "en-US": "Anh-Mỹ",
  "en-AU": "Anh-Úc",
  "en-IN": "Anh-Ấn",
  "en-IE": "Anh-Ireland",
  "en-CA": "Anh-Canada",
  "zh-CN": "Phổ thông",
  "cmn-CN": "Phổ thông",
};

export function BrowserVoicePicker({ lang, sample, speak }: { lang: VoiceLang; sample: string; speak: (text: string) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pick, setPick] = useState<BrowserVoicePick>("auto");

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setPick(getBrowserVoicePick(lang));
    const load = () => setVoices(deviceVoices(lang));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const timer = window.setTimeout(load, 1500);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearTimeout(timer);
    };
  }, [lang]);

  if (!voices.length) return null;
  const best = voices[0]!;
  const anyNatural = voices.some((v) => isNaturalVoice(v, lang));
  const choose = (value: BrowserVoicePick) => {
    setPick(value);
    setBrowserVoicePick(lang, value);
    window.setTimeout(() => speak(sample), 50);
  };
  const autoLabel =
    lang === "en" && !isNaturalVoice(best, lang) ? "Tự động (giọng thu sẵn, thiếu thì dùng giọng máy)" : `Tự động — giọng tốt nhất (${best.name})`;

  return (
    <details className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold text-stone-900">🔊 Giọng đọc trên máy này</summary>
      <div className="mt-3 space-y-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-stone-700">Chọn giọng (máy tự đọc thử khi đổi)</span>
          <select value={pick} onChange={(e) => choose(e.target.value)} className="rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-stone-300">
            <option value="auto">{autoLabel}</option>
            {lang === "en" && <option value="recorded">Giọng thu sẵn (Kokoro, giọng cũ)</option>}
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {isNaturalVoice(v, lang) ? "⭐ " : ""}
                {v.name} · {ACCENT[v.lang.replace("_", "-")] ?? v.lang}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => speak(sample)} className="rounded-xl bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800">
            Nghe thử
          </button>
          <span className="text-stone-500">
            ⭐ = giọng tự nhiên. Lựa chọn lưu trên trình duyệt này.
            {!anyNatural &&
              (lang === "zh"
                ? " Máy này chưa có giọng tự nhiên — mở bằng Microsoft Edge (giọng Xiaoxiao Online) hoặc Chrome (Google 普通话) sẽ dễ nghe hơn."
                : " Máy này chưa có giọng tự nhiên — mở bằng Microsoft Edge (giọng Online Natural) hoặc Chrome (Google UK English) sẽ dễ nghe hơn.")}
          </span>
        </div>
      </div>
    </details>
  );
}
