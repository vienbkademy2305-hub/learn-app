"use client";
/**
 * English text-to-speech with the browser's voices (ENGLISH_SPLIT_PLAN Q3): no recorded audio yet.
 * Prefers a British voice, falls back to American, then to any English voice.
 */
import { useEffect, useState } from "react";
import { SpeakerIcon } from "@/features/audio/SpeakerIcon";

type VoiceState = "loading" | "available" | "unavailable";

function findEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "en-GB" && /natural|online/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-GB") ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => /^en[-_]/i.test(v.lang)) ??
    null
  );
}

export function useEnglishVoice(): VoiceState {
  const [state, setState] = useState<VoiceState>("loading");
  useEffect(() => {
    if (!("speechSynthesis" in window)) return setState("unavailable");
    const check = () => setState(findEnglishVoice() ? "available" : "unavailable");
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    const timer = window.setTimeout(check, 1500);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", check);
      window.clearTimeout(timer);
    };
  }, []);
  return state;
}

export function speakEnglish(text: string, rate = 1, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  const voice = findEnglishVoice();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else u.lang = "en-GB";
  u.rate = rate;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}

/** Play button (normal speed) plus an optional slow button. */
export function Say({ text, slow = false, label, className = "" }: { text: string; slow?: boolean; label?: string; className?: string }) {
  const voice = useEnglishVoice();
  const [playing, setPlaying] = useState<null | number>(null);
  if (voice === "unavailable") return null;
  const play = (rate: number) => {
    setPlaying(rate);
    speakEnglish(text, rate, () => setPlaying(null));
  };
  const btn = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors";
  return (
    <span className={`inline-flex shrink-0 gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => play(0.95)}
        aria-label={`Nghe: ${text}`}
        className={`${btn} ${playing === 0.95 ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-sky-800 ring-sky-200 hover:bg-sky-50"}`}
      >
        <SpeakerIcon className="size-3.5" />
        {label}
      </button>
      {slow && (
        <button
          type="button"
          onClick={() => play(0.6)}
          aria-label={`Nghe chậm: ${text}`}
          className={`${btn} ${playing === 0.6 ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-sky-800 ring-sky-200 hover:bg-sky-50"}`}
        >
          Chậm
        </button>
      )}
    </span>
  );
}
