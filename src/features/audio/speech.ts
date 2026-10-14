"use client";
/**
 * Browser text-to-speech for words and characters, which have no recorded
 * audio in any source (REPO_AUDIT §9). Only used when the device has a
 * Mandarin voice — otherwise the default voice would mispronounce Chinese.
 * The voice is the learner's pick or the most natural one on the device (./browser-voices.ts).
 * When the learner picked a voice of the TTS service (docs/TTS_SERVICE_PLAN.md), that voice reads instead and the
 * device voice is only the fallback (service not deployed, clip not allowed, monthly cap reached).
 */
import { useEffect, useState } from "react";
import { getVoiceChoice, ttsUrl } from "@/features/tts/client";
import { chosenVoice } from "./browser-voices";

const ttsVoice = () => (typeof window === "undefined" ? "recorded" : getVoiceChoice("zh").main);
let current: HTMLAudioElement | null = null;
/** Bumped by every play/stop so a TTS answer that arrives late does not start over newer audio. */
let playToken = 0;

export type VoiceState = "loading" | "available" | "unavailable";

function findChineseVoice(): SpeechSynthesisVoice | null {
  return chosenVoice("zh");
}

export function useChineseVoice(): VoiceState {
  const [state, setState] = useState<VoiceState>("loading");
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setState("unavailable");
      return;
    }
    const check = () => setState(findChineseVoice() || ttsVoice() !== "recorded" ? "available" : "unavailable");
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
  stopSpeaking();
  const voice = ttsVoice();
  if (voice !== "recorded") {
    const token = playToken;
    void ttsUrl(voice, text).then((url) => {
      if (token !== playToken) return;
      if (!url) return speakDevice(text, rate, onEnd);
      const audio = new Audio(url);
      // one clip per text: slow speeds play it slower (0.5 → 0.7×, so it stays natural)
      audio.playbackRate = rate >= 0.8 ? 1 : Math.max(0.7, rate + 0.2);
      const done = () => {
        if (current === audio) current = null;
        onEnd?.();
      };
      audio.onended = done;
      audio.onerror = done;
      current = audio;
      audio.play().catch(done);
    });
    return;
  }
  speakDevice(text, rate, onEnd);
}

function speakDevice(text: string, rate: number, onEnd?: () => void): void {
  if (!("speechSynthesis" in window)) return onEnd?.();
  const synth = window.speechSynthesis;
  const voice = findChineseVoice();
  if (!voice) return onEnd?.();
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
  playToken++;
  current?.pause();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
