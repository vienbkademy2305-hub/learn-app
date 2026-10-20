"use client";
/**
 * "Chấm phát âm": record one English sentence, send it to the OpenPronounce server on the learner's computer
 * (./pronounce.ts), show the score and the words that sounded wrong. The recording is not stored anywhere.
 * Without that server (phone, server off) the browser's speech recognition checks which words were said.
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { browserReport, serverReport, type Report, type WordReport } from "@/domain/pron-report";
import { assessSpeech } from "@/domain/speech-match";
import { acquireMic, releaseMicSoon } from "@/features/speaking/recorder";
import { canRecognize, listen, recognizeError, type Listening } from "@/features/speaking/recognize";
import { loadIpa } from "./ipa";
import { addReportToPhones } from "./phone-store";
import { PronounceReport } from "./PronounceReport";
import { stopEnglish } from "./speech";
import { assessPronunciation, PronounceOffline, pronounceAvailable, pronounceEnabled } from "./pronounce";

// loaded on demand: the practice mode itself uses this component, so a static import would be circular
const WeakPractice = dynamic(() => import("./WeakPractice").then((m) => m.WeakPractice), { ssr: false });

type State = "idle" | "recording" | "checking" | "done" | "offline" | "error";

function micError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Bạn chưa cho phép dùng micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang để cho phép, rồi thử lại.";
  if (name === "NotFoundError") return "Không tìm thấy micro trên thiết bị này.";
  return "Không ghi âm được. Hãy thử lại bằng Chrome hoặc Edge.";
}

/** Rough reading time: 3 s + 0.7 s per word, at most 40 s. */
const maxSeconds = (text: string) => Math.min(40, 3 + Math.ceil(text.split(/\s+/).length * 0.7));

export function PronounceCheck({ text, compact = false, onScore, nested = false }: { text: string; compact?: boolean; /** the check inside a word sheet: no further retry */ nested?: boolean; /** called with each new score (0–100) */ onScore?: (score: number) => void }) {
  const [open, setOpen] = useState(!compact);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [practice, setPractice] = useState<WordReport[] | null>(null);
  const [mine, setMine] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
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
    setReport(null);
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
    // Never stay on "recording" forever (e.g. the permission prompt was ignored): stop a little after the longest reading time.
    const giveUp = window.setTimeout(() => l.stop(), (maxSeconds(text) + 6) * 1000);
    try {
      const alts = await l.result;
      const m = assessSpeech(text, alts, "en", l.meta);
      const rep = browserReport(text, m, alts[0] ?? "", await loadIpa());
      setReport(rep);
      void addReportToPhones(rep);
      setState("done");
      onScore?.(m.score);
    } catch (e) {
      setState("error");
      setError(recognizeError((e as Error).message));
    } finally {
      window.clearTimeout(giveUp);
      live.current = null;
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const start = async () => {
    stopEnglish();
    setError("");
    setReport(null);
    // The server is off by default: go straight to the browser's recognition, inside the tap (Safari drops the tap after an await).
    if (canRecognize() && !pronounceEnabled()) return startBrowser();
    if (canRecognize() && !(await pronounceAvailable())) return startBrowser();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await acquireMic();
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
      releaseMicSoon();
      const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
      setMine(URL.createObjectURL(blob));
      setState("checking");
      try {
        const res = await assessPronunciation(blob, text);
        const rep = serverReport(text, res);
        setReport(rep);
        void addReportToPhones(rep);
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
          Chưa kết nối được máy chấm chi tiết (cần chạy <strong>Chạy chấm phát âm.bat</strong> trên máy tính).{" "}
          <button type="button" onClick={() => void startBrowser()} className="font-semibold text-rose-700 underline">Chấm bằng nhận dạng giọng nói của trình duyệt</button>{" "}
          <Link href="/en/luyen-noi" className="font-medium underline">Hướng dẫn</Link>
        </p>
      )}

      {report && (
        <PronounceReport
          report={report}
          mineUrl={mine}
          retry={nested ? undefined : (word) => <PronounceCheck text={word} compact={false} nested />}
          onPractice={nested ? undefined : setPractice}
        />
      )}
      {practice && <WeakPractice words={practice} onClose={() => setPractice(null)} />}
    </div>
  );
}
