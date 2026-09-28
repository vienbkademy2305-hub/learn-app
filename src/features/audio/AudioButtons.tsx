"use client";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/storage-url";
import { SpeakerIcon } from "./SpeakerIcon";

type Speed = "normal" | "slow";

/** Normal / slow playback of a sentence. Receives storage keys, never raw URLs (ARCHITECTURE §4). */
export function AudioButtons({ audio, compact = false }: { audio: { normal?: string; slow?: string }; compact?: boolean }) {
  const player = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<Speed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => player.current?.pause(), []);

  if (!audio.normal && !audio.slow) return null;

  const play = (speed: Speed) => {
    const key = audio[speed];
    if (!key) return;
    player.current?.pause();
    const el = new Audio(assetUrl(key));
    player.current = el;
    setFailed(false);
    setPlaying(speed);
    el.onended = () => setPlaying(null);
    el.onerror = () => {
      setPlaying(null);
      setFailed(true);
    };
    el.play().catch(() => {
      setPlaying(null);
      setFailed(true);
    });
  };

  const base = "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset transition-colors";
  const size = compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const tone = (s: Speed) => (playing === s ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100");

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {audio.normal && (
        <button type="button" onClick={() => play("normal")} className={`${base} ${size} ${tone("normal")}`} aria-label="Nghe câu với tốc độ bình thường">
          <SpeakerIcon /> Nghe
        </button>
      )}
      {audio.slow && (
        <button type="button" onClick={() => play("slow")} className={`${base} ${size} ${tone("slow")}`} aria-label="Nghe câu chậm">
          <SpeakerIcon /> Chậm
        </button>
      )}
      {failed && <span className="text-xs text-brand-700">Không phát được audio</span>}
    </span>
  );
}
