"use client";
/** Lets the learner pick the TTS voices (main + second voice for dialogues). Hidden when the service is not set up. */
import { useEffect, useState } from "react";
import { getVoiceChoice, loadTtsVoices, setVoiceChoice, type TtsLang, type TtsVoice, type VoiceChoice } from "./client";

const LANG_PREFIX: Record<TtsLang, string> = { en: "en", zh: "cmn" };
const ACCENT: Record<string, string> = { "en-GB": "Anh-Anh", "en-US": "Anh-Mỹ", "en-AU": "Anh-Úc", "en-IN": "Anh-Ấn", "cmn-CN": "Phổ thông" };
const GENDER = { female: "nữ", male: "nam", neutral: "" } as const;

export function VoicePicker({ lang, sample, speak }: { lang: TtsLang; sample: string; speak: (text: string) => void }) {
  const [info, setInfo] = useState<{ voices: TtsVoice[]; cap: number; used: number } | null | undefined>(undefined);
  const [choice, setChoice] = useState<VoiceChoice | null>(null);

  useEffect(() => {
    setChoice(getVoiceChoice(lang));
    void loadTtsVoices().then(setInfo);
  }, [lang]);

  if (!info || !choice) return null;
  const voices = info.voices.filter((v) => v.lang.toLowerCase().startsWith(LANG_PREFIX[lang]));
  if (!voices.length) return null;
  const groups = [...new Set(voices.map((v) => v.lang))];
  const update = (next: VoiceChoice) => {
    setChoice(next);
    setVoiceChoice(lang, next);
  };
  const select = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-stone-300">
        <option value="recorded">Giọng thu sẵn (mặc định)</option>
        {groups.map((g) => (
          <optgroup key={g} label={ACCENT[g] ?? g}>
            {voices.filter((v) => v.lang === g).map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} {GENDER[v.gender] && `(${GENDER[v.gender]})`}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );

  return (
    <details className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold text-stone-900">🔊 Giọng đọc</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {select(choice.main, (main) => update({ ...choice, main }), "Giọng chính (từ, câu, bài nghe)")}
        {select(choice.second, (second) => update({ ...choice, second }), "Giọng thứ hai (người còn lại trong hội thoại)")}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" onClick={() => speak(sample)} className="rounded-xl bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800">
          Nghe thử
        </button>
        <span className="text-stone-500">
          Câu nào chưa có bản thu của giọng này thì tạm dùng giọng thu sẵn. Tháng này đã dùng {info.used.toLocaleString("vi-VN")}/{info.cap.toLocaleString("vi-VN")} ký tự.
        </span>
      </div>
    </details>
  );
}
