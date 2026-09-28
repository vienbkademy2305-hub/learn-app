"use client";
import { useEffect, useRef, useState } from "react";
import type { SoundItem } from "@/content/pronunciation";
import { SpeakerIcon } from "@/features/audio/SpeakerIcon";
import { speakChinese, useChineseVoice } from "@/features/audio/speech";

/** Fired when a sound button is pressed but the device has no Mandarin voice; VoiceNotice reacts to it. */
const NEED_VOICE = "chinese-app:need-voice";

/** Speaks, or asks VoiceNotice to explain how to install a Mandarin voice. */
function useSpeak() {
  const voice = useChineseVoice();
  return {
    voice,
    speak: (text: string, rate: number, onEnd?: () => void) => {
      if (voice === "available") speakChinese(text, rate, onEnd);
      else {
        window.dispatchEvent(new Event(NEED_VOICE));
        onEnd?.();
      }
    },
  };
}

/** One sound: big pinyin, example character, Vietnamese comparison; tap to hear the example. */
export function SoundTile({ item }: { item: SoundItem }) {
  const { speak } = useSpeak();
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        speak(item.hanzi, 0.7, () => setPlaying(false));
      }}
      aria-label={`Nghe ${item.sound}: ${item.hanzi} ${item.pinyin}`}
      className={`flex h-full w-full flex-col gap-1 rounded-xl p-3 text-left ring-1 ring-inset transition-colors ${
        playing ? "bg-brand-50 ring-brand-500" : "bg-white ring-stone-200 hover:ring-brand-300"
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold text-brand-700">{item.sound}</span>
        <span className="text-right text-sm text-stone-500">
          <span lang="zh-CN" className="font-han text-lg text-stone-900">{item.hanzi}</span> {item.pinyin} <SpeakerIcon className="inline size-4 align-[-2px] text-brand-600" />
        </span>
      </span>
      <span className="text-sm text-stone-700">{item.vi}</span>
      {item.warn && <span className="text-xs font-medium text-amber-700">⚠ {item.warn}</span>}
    </button>
  );
}

/** Speaks a short Chinese text (tone examples, sandhi words). */
export function SpeakChip({ text, label, rate = 0.7 }: { text: string; label: string; rate?: number }) {
  const { speak } = useSpeak();
  return (
    <button type="button" onClick={() => speak(text, rate)} className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-medium text-brand-700 ring-1 ring-inset ring-brand-200 hover:bg-brand-50">
      {label} <SpeakerIcon className="size-3.5" />
    </button>
  );
}

/**
 * Shown at the top when the device has no Mandarin voice: which voices the browser has,
 * and how to add a Chinese one. Scrolls into view and pulses when a sound button is pressed.
 */
export function VoiceNotice() {
  const voice = useChineseVoice();
  const box = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (voice !== "unavailable") return;
    setVoices(window.speechSynthesis?.getVoices().map((v) => `${v.name} (${v.lang})`) ?? []);
    const onNeed = () => {
      box.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1200);
    };
    window.addEventListener(NEED_VOICE, onNeed);
    return () => window.removeEventListener(NEED_VOICE, onNeed);
  }, [voice]);

  if (voice !== "unavailable") return null;
  return (
    <div ref={box} role="status" className={`space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-inset transition-all ${flash ? "ring-4 ring-amber-400" : "ring-1 ring-amber-200"}`}>
      <p className="font-semibold">Máy/trình duyệt này chưa có giọng đọc tiếng Trung nên chưa phát được âm mẫu.</p>
      <p>
        Trình duyệt đang có: <span className="text-amber-800">{voices.length ? voices.join(", ") : "không có giọng đọc nào"}</span>.
      </p>
      <p className="font-medium">Cách bật (chọn 1):</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Dễ nhất:</strong> mở trang này bằng <strong>Microsoft Edge</strong> hoặc <strong>Google Chrome</strong> (có mạng) — hai trình duyệt này có sẵn giọng tiếng Trung online.
        </li>
        <li>
          <strong>Windows:</strong> Cài đặt → Thời gian &amp; ngôn ngữ → Ngôn ngữ &amp; vùng → Thêm ngôn ngữ → <strong>中文(中华人民共和国) / Chinese (Simplified, China)</strong>, tích chọn <strong>Chuyển văn bản thành giọng nói</strong>. Cài xong khởi động lại trình duyệt.
        </li>
        <li>
          <strong>Điện thoại:</strong> Android — Cài đặt → Chuyển văn bản thành giọng nói → tải giọng tiếng Trung; iPhone — Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung.
        </li>
      </ul>
      <p className="text-xs text-amber-800">Câu ví dụ trong các bài học dùng file ghi âm thật nên vẫn nghe được bình thường.</p>
    </div>
  );
}
