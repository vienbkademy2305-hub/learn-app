"use client";
/**
 * "Chấm phát âm": record one English sentence, send it to the OpenPronounce server on the learner's computer
 * (./pronounce.ts), show the score and the words that sounded wrong. The recording is not stored anywhere.
 * Without that server (phone, server off) the browser's speech recognition checks which words were said.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { matchSpeech, type MatchResult } from "@/domain/speech-match";
import { canRecognize, listen, recognizeError, type Listening } from "@/features/speaking/recognize";
import { stopEnglish } from "./speech";
import { assessPronunciation, normWord, PronounceOffline, pronounceAvailable, scoreTone, type PronounceResult } from "./pronounce";

type State = "idle" | "recording" | "checking" | "done" | "offline" | "error";

function micError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang để cho phép, rồi thử lại.";
  if (name === "NotFoundError") return "Không tìm thấy micro trên thiết bị này.";
  return "Không ghi âm được. Hãy thử lại bằng Chrome hoặc Edge.";
}

/** Rough reading time: 3 s + 0.7 s per word, at most 40 s. */
const maxSeconds = (text: string) => Math.min(40, 3 + Math.ceil(text.split(/\s+/).length * 0.7));

export function PronounceCheck({ text, compact = false, onScore }: { text: string; compact?: boolean; /** called with each new score (0–100) */ onScore?: (score: number) => void }) {
  const [open, setOpen] = useState(!compact);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PronounceResult | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [match, setMatch] = useState<{ m: MatchResult; heard: string } | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const live = useRef<Listening | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    if (rec.current?.state === "recording") rec.current.stop();
    live.current?.stop();
  }, []);
  useEffect(() => () => void (mine && URL.revokeObjectURL(mine)), [mine]);
  // A new target sentence starts from scratch.
  useEffect(() => {
    setState("idle");
    setResult(null);
    setMatch(null);
    setMine(null);
  }, [text]);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    if (rec.current?.state === "recording") rec.current.stop();
    live.current?.stop();
  };

  /** Browser speech recognition: which words were said (no sound-level detail). */
  const startBrowser = async () => {
    setState("recording");
    setElapsed(0);
    const began = performance.now();
    timer.current = window.setInterval(() => setElapsed((performance.now() - began) / 1000), 100);
    const l = listen("en");
    live.current = l;
    try {
      const alts = await l.result;
      const m = matchSpeech(text, alts, "en");
      setMatch({ m, heard: alts[0] ?? "" });
      setState("done");
      onScore?.(m.score);
    } catch (e) {
      setState("error");
      setError(recognizeError((e as Error).message));
    } finally {
      live.current = null;
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const start = async () => {
    stopEnglish();
    setError("");
    setResult(null);
    setMatch(null);
    if (canRecognize() && !(await pronounceAvailable())) return startBrowser();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch (err) {
      setState("error");
      setError(micError(err));
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    rec.current = r;
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
      setMine(URL.createObjectURL(blob));
      setState("checking");
      try {
        const res = await assessPronunciation(blob, text);
        setResult(res);
        setState("done");
        onScore?.(res.score);
      } catch (err) {
        if (err instanceof PronounceOffline) setState("offline");
        else {
          setState("error");
          setError("Máy chấm báo lỗi khi phân tích bản ghi. Hãy đọc lại rõ hơn, gần micro hơn.");
        }
      }
    };
    r.start();
    setState("recording");
    const began = performance.now();
    const limit = maxSeconds(text);
    setElapsed(0);
    timer.current = window.setInterval(() => {
      const s = (performance.now() - began) / 1000;
      setElapsed(s);
      if (s >= limit) stop();
    }, 100);
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          void pronounceAvailable();
          setOpen(true);
        }}
        aria-label={`Chấm phát âm: ${text}`}
        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50"
      >
        🎤 Nói
      </button>
    );

  const bad = new Set((result?.differences.words_with_errors ?? []).map(normWord));
  const tone = result ? scoreTone(result.score) : null;
  return (
    <div className="mt-3 w-full space-y-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {state === "recording" ? (
          <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            <span className="size-2.5 animate-pulse rounded-full bg-white" /> Dừng ({elapsed.toFixed(0)}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={state === "checking"}
            className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
          >
            🎤 {state === "idle" ? "Ghi âm và chấm" : "Đọc lại"}
          </button>
        )}
        {mine && state !== "recording" && <audio src={mine} controls className="h-9 max-w-full" />}
        {compact && (
          <button type="button" onClick={() => setOpen(false)} className="ml-auto text-xs text-stone-500 hover:underline">
            Đóng
          </button>
        )}
      </div>

      {state === "checking" && (
        <p className="text-sm text-stone-600">Đang chấm… (lần đầu sau khi bật máy chấm có thể mất 1–2 phút để nạp mô hình)</p>
      )}
      {state === "error" && <p className="text-sm text-red-700">{error}</p>}
      {state === "offline" && (
        <p className="text-sm text-amber-800">
          Chưa kết nối được máy chấm phát âm. Trên máy tính, mở <strong>Chạy chấm phát âm.bat</strong> (trong thư mục OpenPronounce) rồi thử lại.{" "}
          <Link href="/en/luyen-noi" className="font-medium underline">Hướng dẫn</Link>
        </p>
      )}

      {match && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-xl px-3 py-1.5 text-2xl font-bold ${scoreTone(match.m.score).cls}`}>{match.m.score}</span>
            <span className="font-semibold text-stone-800">{match.m.score >= 80 ? "Nói đúng câu" : "Còn thiếu / sai từ"}</span>
          </div>
          <p lang="en" className="text-lg leading-relaxed">
            {match.m.parts.map((p, i) => (
              <span key={i} className={!p.token ? "" : p.ok ? "text-jade-700" : "rounded bg-red-100 px-0.5 text-red-700 underline decoration-wavy"}>{p.text}</span>
            ))}
          </p>
          <p className="text-xs text-stone-500">
            Máy nghe được: <span lang="en" className="font-mono">{match.heard}</span> · Chấm bằng nhận dạng giọng nói của trình duyệt (đúng/sai từ). Muốn chấm chi tiết từng âm: bật máy chấm OpenPronounce trên máy tính.
          </p>
        </div>
      )}

      {result && tone && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-xl px-3 py-1.5 text-2xl font-bold ${tone.cls}`}>{Math.round(result.score)}</span>
            <span className="font-semibold text-stone-800">{tone.label}</span>
          </div>
          <p lang="en" className="text-lg leading-relaxed">
            {text.split(/(\s+)/).map((w, i) =>
              /\s/.test(w) ? w : (
                <span key={i} className={bad.has(normWord(w)) ? "rounded bg-red-100 px-0.5 text-red-700 underline decoration-wavy" : "text-jade-700"}>{w}</span>
              ),
            )}
          </p>
          {result.differences.errors.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {result.differences.errors.map((e) => (
                <li key={`${e.position}-${e.word}`} className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
                  <span lang="en" className="font-semibold">{e.word}</span>: cần đọc <span className="font-mono text-jade-700">/{e.expected}/</span>, máy nghe thấy{" "}
                  <span className="font-mono text-red-700">{e.actual ? `/${e.actual}/` : "(bị nuốt mất)"}</span>
                  {e.phones && e.phones.length > 0 && (
                    <span className="text-stone-500">
                      {" "}· âm sai: {e.phones.map((p) => `${p.expected || "∅"} → ${p.heard || "∅"}`).join(", ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-jade-700">Không phát hiện từ nào đọc sai. 🎉</p>
          )}
          <p className="text-xs text-stone-500">
            Máy nghe được: <span lang="en" className="font-mono">{result.transcribe.toLowerCase()}</span> · Máy chấm có thể báo nhầm với từ ngắn — nghe lại bản ghi của bạn để tự đối chiếu.
          </p>
        </div>
      )}
    </div>
  );
}
