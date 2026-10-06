"use client";
/**
 * English audio, in this order:
 * 1. the voice the learner picked from the TTS service (docs/TTS_SERVICE_PLAN.md; src/features/tts/client.ts);
 * 2. MP3 files made by `pnpm en:audio` (docs/EN_AUDIO_PLAN.md), listed in assets/en-audio/manifest.json;
 * 3. the browser's voices (ENGLISH_SPLIT_PLAN Q3), preferring British, then American, then any English voice.
 */
import { useEffect, useState } from "react";
import { castSpeakers } from "@/domain/tts-cast";
import { SpeakerIcon } from "@/features/audio/SpeakerIcon";
import { getVoiceChoice, loadTtsVoices, ttsUrl } from "@/features/tts/client";
import { assetUrl } from "@/lib/storage-url";

type VoiceState = "loading" | "available" | "unavailable";
/** n: normal speed file, s: slow file (words, sentences, listening) */
type AudioEntry = { n: string; s?: string };

let manifest: Record<string, AudioEntry> | null = null;
let manifestLoad: Promise<void> | null = null;
function loadManifest(): Promise<void> {
  manifestLoad ??= fetch(assetUrl("en-audio/manifest.json"))
    .then((r) => (r.ok ? r.json() : null))
    .then((m: { items?: Record<string, AudioEntry> } | null) => void (manifest = m?.items ?? {}))
    .catch(() => void (manifest = {}));
  return manifestLoad;
}
const hasFiles = () => !!manifest && Object.keys(manifest).length > 0;

let current: HTMLAudioElement | null = null;
/** Bumped by every play/stop so a TTS answer that arrives late does not start over newer audio. */
let playToken = 0;

/** Stops whatever English audio is playing (file or browser voice). */
export function stopEnglish() {
  playToken++;
  current?.pause();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Plays one mp3 URL; slow rates play the same file at 0.75× (pitch kept by the browser). */
function playUrl(url: string, rate: number, onEnd?: () => void) {
  const audio = new Audio(url);
  if (rate < 0.8) audio.playbackRate = 0.75;
  const done = () => {
    if (current === audio) current = null;
    onEnd?.();
  };
  audio.onended = done;
  audio.onerror = done;
  current = audio;
  audio.play().catch(done);
}

const ttsVoice = () => (typeof window === "undefined" ? "recorded" : getVoiceChoice("en").main);

/** Plays the recorded file for `text` if there is one; slow rates use the slow file (or 0.8× of the normal one). */
function playFile(text: string, rate: number, onEnd?: () => void): boolean {
  const entry = manifest?.[text];
  if (!entry) return false;
  const slow = rate < 0.8;
  const audio = new Audio(assetUrl(`en-audio/${slow && entry.s ? entry.s : entry.n}`));
  if (slow && !entry.s) audio.playbackRate = 0.8;
  const done = () => {
    if (current === audio) current = null;
    onEnd?.();
  };
  audio.onended = done;
  audio.onerror = done;
  current = audio;
  audio.play().catch(done);
  return true;
}

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
    let alive = true;
    const tts = "speechSynthesis" in window;
    const check = () => alive && setState(hasFiles() || ttsVoice() !== "recorded" || (tts && findEnglishVoice()) ? "available" : "unavailable");
    void loadManifest().then(check);
    if (!tts) return () => void (alive = false);
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    const timer = window.setTimeout(check, 1500);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener("voiceschanged", check);
      window.clearTimeout(timer);
    };
  }, []);
  return state;
}

export function speakEnglish(text: string, rate = 1, onEnd?: () => void) {
  stopEnglish();
  const voice = ttsVoice();
  if (voice !== "recorded") {
    const token = playToken;
    void ttsUrl(voice, text).then((url) => {
      if (token !== playToken) return;
      if (url) playUrl(url, rate, onEnd);
      else speakRecorded(text, rate, onEnd);
    });
    return;
  }
  speakRecorded(text, rate, onEnd);
}

/** Recorded file, else the browser voice. */
function speakRecorded(text: string, rate: number, onEnd?: () => void) {
  if (playFile(text, rate, onEnd)) return;
  if (!("speechSynthesis" in window)) return onEnd?.();
  const synth = window.speechSynthesis;
  const voice = findEnglishVoice();
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
  const voice = ttsVoice();
  if (voice === "recorded") return speakDialogueRecorded(text, turns, rate, onEnd);
  stopEnglish();
  const token = playToken;
  void castTts(turns.map((t) => t.speaker))
    .then((cast) => Promise.all(turns.map((t) => ttsUrl(cast.get(t.speaker)!, t.text))))
    .then((list) => {
      if (token !== playToken) return;
      if (list.some((u) => !u)) return speakDialogueRecorded(text, turns, rate, onEnd);
      const next = (i: number) => {
        if (token !== playToken) return;
        if (i >= list.length) return onEnd?.();
        playUrl(list[i]!, rate, () => (token === playToken ? window.setTimeout(() => next(i + 1), 450) : undefined));
      };
      next(0);
    });
}

/** Speakers → TTS voices of the learner's pair (src/domain/tts-cast.ts). */
async function castTts(speakers: string[]): Promise<Map<string, string>> {
  const { main, second } = getVoiceChoice("en");
  const voices = (await loadTtsVoices())?.voices ?? [];
  return castSpeakers(speakers, main, second, (id) => voices.find((v) => v.id === id)?.gender);
}

function speakDialogueRecorded(text: string, turns: Array<{ speaker: string; text: string }>, rate: number, onEnd?: () => void) {
  if (manifest?.[text]) {
    stopEnglish();
    return speakRecorded(text, rate, onEnd);
  }
  stopEnglish();
  const synth = window.speechSynthesis;
  const first = findEnglishVoice();
  const english = synth.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  const second = english.find((v) => v.name !== first?.name && v.lang !== first?.lang) ?? english.find((v) => v.name !== first?.name) ?? null;
  const speakers = [...new Set(turns.map((t) => t.speaker))];
  synth.cancel();
  turns.forEach((t, i) => {
    const n = speakers.indexOf(t.speaker);
    const k = n % 2;
    const voice = k === 0 ? first : (second ?? first);
    const u = new SpeechSynthesisUtterance(t.text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = "en-GB";
    u.rate = rate;
    if (k === 1 && !second) u.pitch = 0.7; // one voice only: a lower pitch for the second speaker
    if (n >= 2) u.pitch = 1.3; // a third speaker (tutor + two students in Part 3): same voices, higher pitch
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
