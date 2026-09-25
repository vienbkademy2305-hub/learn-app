"use client";
/**
 * Browser text-to-speech for words and characters, which have no recorded
 * audio in any source (REPO_AUDIT §9). Only used when the device has a
 * Mandarin voice — otherwise the default voice would mispronounce Chinese.
 */
import { useEffect, useState } from "react";

export type VoiceState = "loading" | "available" | "unavailable";

function findChineseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "zh-CN") ??
    voices.find((v) => /^zh[-_](CN|Hans)/i.test(v.lang)) ??
    voices.find((v) => /^(zh|cmn)/i.test(v.lang) && !/HK|yue/i.test(v.lang)) ??
    null
  );
}

export function useChineseVoice(): VoiceState {
  const [state, setState] = useState<VoiceState>("loading");
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("unavailable");
      return;
    }
    const check = () => setState(findChineseVoice() ? "available" : "unavailable");
    check();
    // Voices load asynchronously in Chrome/Edge; give them a moment before giving up.
    window.speechSynthesis.addEventListener("voiceschanged", check);
    const timer = window.setTimeout(check, 1500);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", check);
      window.clearTimeout(timer);
    };
  }, []);
  return state;
}

export function speakChinese(text: string, rate: number, onEnd?: () => void): void {
  const synth = window.speechSynthesis;
  const voice = findChineseVoice();
  if (!voice) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
