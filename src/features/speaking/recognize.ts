"use client";
/**
 * The browser's own speech recognition (Chrome/Edge on computer and Android, Safari on iPhone).
 * Works on the phone without the OpenPronounce server; tells what was said, not how each sound was made.
 */
import type { SpeechLang } from "@/domain/speech-match";

type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

function ctor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export const canRecognize = () => ctor() !== null;

export function recognizeError(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") return "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang để cho phép, rồi thử lại.";
  if (code === "no-speech") return "Không nghe thấy gì. Bấm lại rồi nói to, rõ hơn.";
  if (code === "network") return "Nhận dạng giọng nói cần Internet. Kiểm tra kết nối rồi thử lại.";
  if (code === "unsupported") return "Trình duyệt này không nhận dạng giọng nói được. Hãy dùng Chrome (máy tính, Android) hoặc Safari (iPhone).";
  return "Không nhận dạng được. Hãy thử lại.";
}

export interface Listening {
  /** resolves with the recognizer's alternatives (best first); rejects with an error code */
  result: Promise<string[]>;
  stop(): void;
}

/** Listens once (stops by itself after a pause, or when stop() is called). */
export function listen(lang: SpeechLang): Listening {
  const C = ctor();
  if (!C) return { result: Promise.reject(new Error("unsupported")), stop() {} };
  const rec = new C();
  rec.lang = lang === "zh" ? "zh-CN" : "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  rec.continuous = false;
  let alts: string[] = [];
  const result = new Promise<string[]>((resolve, reject) => {
    let failed = false;
    rec.onresult = (e) => {
      // Join every final segment; keep the alternatives of the last one.
      const segs = Array.from(e.results);
      const head = segs.slice(0, -1).map((r) => r[0]?.transcript ?? "").join(" ");
      const last = segs[segs.length - 1];
      alts = last ? Array.from(last).map((a) => `${head} ${a.transcript}`.trim()) : [];
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      failed = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (failed) return;
      if (alts.length) resolve(alts);
      else reject(new Error("no-speech"));
    };
  });
  rec.start();
  return { result, stop: () => rec.stop() };
}
