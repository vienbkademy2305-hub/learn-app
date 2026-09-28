"use client";
/**
 * Microphone recording + decoding for speaking practice (docs/SPEAKING_PLAN.md §2).
 * The recording stays in memory (blob URL) and is never uploaded or stored.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { resample, trackPitch, type PitchFrame } from "@/domain/speaking/pitch";
import { signalStats, type SignalStats } from "@/domain/speaking/assess";

export type RecorderState = "idle" | "requesting" | "recording" | "processing" | "ready" | "error";

export interface Recording {
  url: string;
  frames: PitchFrame[];
  stats: SignalStats;
  seconds: number;
}

const ANALYSIS_RATE = 16000;
let sharedContext: AudioContext | null = null;
function audioContext(): AudioContext {
  sharedContext ??= new AudioContext();
  return sharedContext;
}

/** Decodes any browser-recorded or MP3 audio to mono 16 kHz samples. */
export async function decodeMono(data: ArrayBuffer): Promise<Float32Array> {
  const buffer = await audioContext().decodeAudioData(data);
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i]! += ch[i]! / buffer.numberOfChannels;
  }
  return resample(mono, buffer.sampleRate, ANALYSIS_RATE);
}

export async function analyse(data: ArrayBuffer): Promise<{ frames: PitchFrame[]; stats: SignalStats; seconds: number }> {
  const samples = await decodeMono(data);
  return { frames: trackPitch(samples, ANALYSIS_RATE), stats: signalStats(samples), seconds: samples.length / ANALYSIS_RATE };
}

const referenceCache = new Map<string, Promise<PitchFrame[]>>();
/** Pitch frames of a reference recording (sentence audio), fetched once per page. */
export function referenceFrames(url: string): Promise<PitchFrame[]> {
  let p = referenceCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(async (buf) => (await analyse(buf)).frames);
    referenceCache.set(url, p);
    p.catch(() => referenceCache.delete(url));
  }
  return p;
}

function errorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Bạn chưa cho phép dùng micro. Bấm vào biểu tượng ổ khóa cạnh địa chỉ trang để cho phép, rồi thử lại.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Không tìm thấy micro trên thiết bị này.";
  if (name === "NotReadableError") return "Micro đang bị ứng dụng khác sử dụng.";
  return "Không ghi âm được. Hãy thử lại hoặc dùng trình duyệt khác (Chrome, Edge, Safari).";
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const media = useRef<MediaRecorder | null>(null);
  const timers = useRef<number[]>([]);
  const urlRef = useRef<string | null>(null);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(
    () => () => {
      clearTimers();
      if (media.current?.state === "recording") media.current.stop();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const stop = useCallback(() => {
    clearTimers();
    if (media.current?.state === "recording") media.current.stop();
  }, []);

  const start = useCallback(async (maxSeconds: number) => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Safari mới.");
      return;
    }
    setState("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (err) {
      setState("error");
      setError(errorMessage(err));
      return;
    }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    media.current = recorder;
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("processing");
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const analysis = await analyse(await blob.arrayBuffer());
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(blob);
        setRecording({ url: urlRef.current, ...analysis });
        setState("ready");
      } catch {
        setState("error");
        setError("Không đọc được bản ghi âm. Hãy thử lại.");
      }
    };
    recorder.start();
    setState("recording");
    setElapsed(0);
    const began = performance.now();
    const tick = () => {
      setElapsed((performance.now() - began) / 1000);
      timers.current.push(window.setTimeout(tick, 100));
    };
    tick();
    timers.current.push(window.setTimeout(() => stop(), maxSeconds * 1000));
  }, [stop]);

  return { state, error, recording, elapsed, start, stop };
}
