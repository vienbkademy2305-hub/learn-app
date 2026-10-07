"use client";
/**
 * "Nói từ tiếng Việt": the learner sees a Vietnamese sentence and says it in English or Chinese.
 * Hints come one level at a time; the browser's speech recognition checks what was said (./recognize.ts).
 */
import { useEffect, useRef, useState } from "react";
import { matchSpeech, type MatchResult, type SpeechLang } from "@/domain/speech-match";
import { canRecognize, listen, recognizeError, type Listening } from "./recognize";

export type SayItBackProps = {
  lang: SpeechLang;
  /** Vietnamese prompt */
  vi: string;
  /** the sentence to say */
  answer: string;
  /** progressive hints shown before the answer (e.g. first letters; pinyin) */
  hints?: string[];
  /** plays the model audio of `answer` */
  play?: () => void;
  /** extra line under the answer (e.g. pinyin) */
  answerNote?: string;
  onScore?: (score: number) => void;
  /** smaller layout inside a dialogue */
  compact?: boolean;
};

export const PASS = 80;

export function SayItBack({ lang, vi, answer, hints = [], play, answerNote, onScore, compact = false }: SayItBackProps) {
  const [hintLevel, setHintLevel] = useState(0);
  const [state, setState] = useState<"idle" | "listening" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [heard, setHeard] = useState("");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [shown, setShown] = useState(false);
  const [supported, setSupported] = useState(true);
  const live = useRef<Listening | null>(null);

  useEffect(() => setSupported(canRecognize()), []);
  useEffect(() => {
    setHintLevel(0);
    setState("idle");
    setMatch(null);
    setShown(false);
    setHeard("");
  }, [answer]);
  useEffect(() => () => live.current?.stop(), []);

  const speak = async () => {
    setError("");
    setState("listening");
    const l = listen(lang);
    live.current = l;
    try {
      const alts = await l.result;
      const m = matchSpeech(answer, alts, lang);
      setHeard(alts[0] ?? "");
      setMatch(m);
      setState("done");
      setShown(true);
      onScore?.(m.score);
    } catch (e) {
      setState("error");
      setError(recognizeError((e as Error).message));
    } finally {
      live.current = null;
    }
  };

  const ok = match && match.score >= PASS;
  const btn = "rounded-xl px-4 py-2 text-sm font-semibold";
  return (
    <div className={`space-y-3 rounded-xl border ${ok ? "border-jade-100 bg-jade-50/50" : "border-amber-100 bg-amber-50/40"} ${compact ? "p-3" : "p-4"}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Nói bằng {lang === "zh" ? "tiếng Trung" : "tiếng Anh"}:</p>
        <p className={compact ? "text-base font-medium text-stone-900" : "text-lg font-medium text-stone-900"}>{vi}</p>
      </div>

      {!shown && hintLevel > 0 && (
        <ul className="space-y-1">
          {hints.slice(0, hintLevel).map((h, i) => (
            <li key={i} lang={lang === "zh" ? "zh-CN" : "en"} className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm text-stone-700 ring-1 ring-stone-200">
              💡 {h}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {supported ? (
          state === "listening" ? (
            <button type="button" onClick={() => live.current?.stop()} className={`${btn} inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700`}>
              <span className="size-2.5 animate-pulse rounded-full bg-white" /> Đang nghe… bấm khi nói xong
            </button>
          ) : (
            <button type="button" onClick={speak} className={`${btn} bg-rose-700 text-white hover:bg-rose-800`}>
              🎤 {match ? "Nói lại" : "Nói"}
            </button>
          )
        ) : null}
        {!shown && hintLevel < hints.length && (
          <button type="button" onClick={() => setHintLevel((n) => n + 1)} className={`${btn} bg-white text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50`}>
            💡 Gợi ý {hints.length > 1 ? `(${hintLevel + 1}/${hints.length})` : ""}
          </button>
        )}
        {!shown && (
          <button type="button" onClick={() => setShown(true)} className={`${btn} text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50`}>
            Xem đáp án
          </button>
        )}
      </div>

      {!supported && <p className="text-sm text-amber-800">{recognizeError("unsupported")} Bạn vẫn có thể tự nói rồi bấm “Xem đáp án” để so.</p>}
      {state === "error" && <p className="text-sm text-red-700">{error}</p>}

      {match && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-lg px-2.5 py-1 text-lg font-bold text-white ${ok ? "bg-jade-600" : match.score >= 50 ? "bg-amber-500" : "bg-red-600"}`}>{match.score}</span>
          <span className="font-medium text-stone-800">{ok ? "Đúng rồi!" : match.score >= 50 ? "Gần đúng — xem chỗ tô đỏ" : "Chưa đúng — nghe mẫu rồi nói lại"}</span>
          <span className="text-stone-500">· Máy nghe được: <span lang={lang === "zh" ? "zh-CN" : "en"} className="font-mono">{heard}</span></span>
        </div>
      )}

      {shown && (
        <div className="space-y-1 rounded-lg bg-white p-3 ring-1 ring-stone-200">
          <div className="flex flex-wrap items-center gap-2">
            <p lang={lang === "zh" ? "zh-CN" : "en"} className={lang === "zh" ? "text-2xl" : "text-lg"}>
              {match
                ? match.parts.map((p, i) => (
                    <span key={i} className={!p.token ? "" : p.ok ? "text-jade-700" : "rounded bg-red-100 text-red-700 underline decoration-wavy"}>{p.text}</span>
                  ))
                : answer}
            </p>
            {play && (
              <button type="button" onClick={play} className="rounded-full px-2 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50">
                🔊 Nghe mẫu
              </button>
            )}
          </div>
          {answerNote && <p className="text-sm text-stone-500">{answerNote}</p>}
        </div>
      )}
    </div>
  );
}
