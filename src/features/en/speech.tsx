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

const SPEAKER_LINE = /^([A-Z][A-Za-z .'-]{0,20}):\s*(.+)$/;

/** "Man: Hello.\nWoman: Hi." → one turn per line; null when the text is not a labelled dialogue. */
export function dialogueTurns(text: string): Array<{ speaker: string; text: string }> | null {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const turns = lines.map((l) => SPEAKER_LINE.exec(l)).filter((m): m is RegExpExecArray => !!m).map((m) => ({ speaker: m[1]!, text: m[2]! }));
  return turns.length >= 2 && turns.length === lines.length && new Set(turns.map((t) => t.speaker)).size >= 2 ? turns : null;
}

/**
 * Reads a labelled dialogue with a different voice per speaker (labels are not read aloud). With only one English
 * voice installed, the speakers differ by pitch. Plain text falls back to speakEnglish.
 */
export function speakDialogue(text: string, rate = 1, onEnd?: () => void) {
  const turns = dialogueTurns(text);
  if (!turns) return speakEnglish(text, rate, onEnd);
  const synth = window.speechSynthesis;
  const first = findEnglishVoice();
  const english = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  const second = english.find((v) => v.name !== first?.name && v.lang !== first?.lang) ?? english.find((v) => v.name !== first?.name) ?? null;
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  synth.cancel();
  turns.forEach((t, i) => {
    const k = speakers.indexOf(t.speaker) % 2;
    const voice = k === 0 ? first : (second ?? first);
    const u = new SpeechSynthesisUtterance(t.text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = "en-GB";
    u.rate = rate;
    if (k === 1 && !second) u.pitch = 0.7; // one voice only: a lower pitch for the second speaker
    if (i === turns.length - 1) {
      u.onend = () => onEnd?.();
      u.onerror = () => onEnd?.();
    }
    synth.speak(u);
  });
}

/** Play button (normal speed) plus an optional slow button. */
export function Say({ text, slow = false, label, className = "", dialogue = false }: { text: string; slow?: boolean; label?: string; className?: string; /** read "Speaker: …" lines with one voice per speaker */ dialogue?: boolean }) {
  const voice = useEnglishVoice();
  const [playing, setPlaying] = useState<null | number>(null);
  if (voice === "unavailable") return null;
  const play = (rate: number) => {
    setPlaying(rate);
    (dialogue ? speakDialogue : speakEnglish)(text, rate, () => setPlaying(null));
  };
  const btn = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors";
  return (
    <span className={`inline-flex shrink-0 gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => play(0.95)}
        aria-label={dialogue ? "Nghe bài" : `Nghe: ${text}`}
        className={`${btn} ${playing === 0.95 ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-sky-800 ring-sky-200 hover:bg-sky-50"}`}
      >
        <SpeakerIcon className="size-3.5" />
        {label}
      </button>
      {slow && (
        <button
          type="button"
          onClick={() => play(0.6)}
          aria-label={dialogue ? "Nghe chậm" : `Nghe chậm: ${text}`}
          className={`${btn} ${playing === 0.6 ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-sky-800 ring-sky-200 hover:bg-sky-50"}`}
        >
          Chậm
        </button>
      )}
    </span>
  );
}
