"use client";
import { useEffect, useState } from "react";
import { SpeakerIcon } from "./SpeakerIcon";
import { speakChinese, stopSpeaking, useChineseVoice } from "./speech";

const RATES = { normal: 0.85, slow: 0.5 } as const;

/**
 * Pronounces a word or character with the device's Mandarin voice.
 * `compact` renders a single icon button (for character tiles).
 */
export function SpeakButtons({ text, compact = false, label }: { text: string; compact?: boolean; label?: string }) {
  const voice = useChineseVoice();
  const [playing, setPlaying] = useState<keyof typeof RATES | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  if (voice === "loading") return null;
  if (voice === "unavailable") {
    return compact ? null : (
      <span className="text-xs text-stone-400" title="Cài giọng đọc tiếng Trung (Trung Quốc) trong cài đặt ngôn ngữ của máy để nghe từ này.">
        Máy chưa có giọng đọc tiếng Trung
      </span>
    );
  }

  const play = (speed: keyof typeof RATES) => {
    setPlaying(speed);
    speakChinese(text, RATES[speed], () => setPlaying(null));
  };

  const base = "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset transition-colors";
  const tone = (s: keyof typeof RATES) => (playing === s ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100");

  if (compact) {
    return (
      <button type="button" onClick={() => play("normal")} className={`${base} ${tone("normal")} p-1.5`} aria-label={`Nghe ${label ?? text}`} title="Giọng đọc của trình duyệt">
        <SpeakerIcon />
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => play("normal")} className={`${base} ${tone("normal")} px-3 py-1.5 text-sm`} aria-label={`Nghe ${label ?? text}`}>
        <SpeakerIcon /> Nghe
      </button>
      <button type="button" onClick={() => play("slow")} className={`${base} ${tone("slow")} px-3 py-1.5 text-sm`} aria-label={`Nghe chậm ${label ?? text}`}>
        <SpeakerIcon /> Chậm
      </button>
      <span className="text-[11px] text-stone-400">giọng máy</span>
    </span>
  );
}
