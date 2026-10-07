"use client";
/**
 * Under a flashcard: "🎤 Nói" (say the word, scored) and "✍️ Viết" (type it from memory, scored).
 * English speaking goes through PronounceCheck (OpenPronounce when reachable, browser recognition otherwise);
 * Chinese speaking uses the browser's recognition (./recognize.ts).
 */
import { useEffect, useRef, useState } from "react";
import { matchSpeech, type MatchResult, type SpeechLang } from "@/domain/speech-match";
import { gradeChinese, gradeEnglish, type SpellResult } from "@/domain/spelling";
import { PronounceCheck } from "@/features/en/PronounceCheck";
import { canRecognize, listen, recognizeError, type Listening } from "./recognize";

type Mode = null | "speak" | "write";
const tone = (s: number) => (s >= 80 ? "bg-jade-600" : s >= 50 ? "bg-amber-500" : "bg-red-600");

/** Say a Chinese word/sentence; the browser recognizer checks the characters. */
function SpeakZh({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "listening" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [res, setRes] = useState<{ m: MatchResult; heard: string } | null>(null);
  const live = useRef<Listening | null>(null);
  useEffect(() => () => live.current?.stop(), []);
  if (!canRecognize()) return <p className="text-sm text-amber-800">{recognizeError("unsupported")}</p>;
  const go = async () => {
    setState("listening");
    const l = listen("zh");
    live.current = l;
    try {
      const alts = await l.result;
      setRes({ m: matchSpeech(text, alts, "zh"), heard: alts[0] ?? "" });
      setState("done");
    } catch (e) {
      setError(recognizeError((e as Error).message));
      setState("error");
    } finally {
      live.current = null;
    }
  };
  return (
    <div className="space-y-2">
      {state === "listening" ? (
        <button type="button" onClick={() => live.current?.stop()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          <span className="size-2.5 animate-pulse rounded-full bg-white" /> Đang nghe… bấm khi nói xong
        </button>
      ) : (
        <button type="button" onClick={go} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800">
          🎤 {res ? "Nói lại" : "Ghi âm và chấm"}
        </button>
      )}
      {state === "error" && <p className="text-sm text-red-700">{error}</p>}
      {res && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-lg px-2.5 py-1 text-lg font-bold text-white ${tone(res.m.score)}`}>{res.m.score}</span>
          <span lang="zh-CN" className="font-han text-2xl">
            {res.m.parts.map((p, i) => <span key={i} className={!p.token ? "" : p.ok ? "text-jade-700" : "rounded bg-red-100 text-red-700"}>{p.text}</span>)}
          </span>
          <span className="text-stone-500">· Máy nghe được: <span lang="zh-CN">{res.heard}</span></span>
        </div>
      )}
    </div>
  );
}

export function WordDrill({
  lang,
  word,
  pinyin,
  meaning,
  onHideWord,
  play,
}: {
  lang: SpeechLang;
  /** English headword or Chinese characters */
  word: string;
  pinyin?: string;
  meaning: string;
  /** asks the card to hide/show the word while the learner writes it */
  onHideWord?: (hide: boolean) => void;
  play?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [typed, setTyped] = useState("");
  const [res, setRes] = useState<SpellResult | null>(null);

  // A new card starts closed.
  useEffect(() => {
    setMode(null);
    setTyped("");
    setRes(null);
    onHideWord?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  const open = (m: Mode) => {
    const next = mode === m ? null : m;
    setMode(next);
    setRes(null);
    setTyped("");
    onHideWord?.(next === "write");
  };
  const check = () => {
    const r = lang === "zh" ? gradeChinese(word, pinyin ?? "", typed) : gradeEnglish(word, typed);
    setRes(r);
    onHideWord?.(false);
    play?.();
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => open(m)}
      aria-pressed={mode === m}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset ${mode === m ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap justify-center gap-2">
        {tab("speak", "🎤 Nói & chấm")}
        {tab("write", "✍️ Viết & chấm")}
      </div>

      {mode === "speak" && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
          <p className="mb-2 text-sm text-stone-600">
            Đọc to: <strong lang={lang === "zh" ? "zh-CN" : "en"} className={lang === "zh" ? "font-han text-lg" : ""}>{word}</strong>
            {pinyin && <span className="ml-2 text-brand-700">{pinyin}</span>}
          </p>
          {lang === "zh" ? <SpeakZh text={word} /> : <PronounceCheck text={word} />}
        </div>
      )}

      {mode === "write" && (
        <div className="space-y-2 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
          <p className="text-sm text-stone-600">
            Viết {lang === "zh" ? "chữ Hán hoặc pinyin (vd. ni3 hao3)" : "từ tiếng Anh"} có nghĩa: <strong className="text-stone-900">{meaning}</strong>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              check();
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              autoFocus
              value={typed}
              onChange={(e) => (setTyped(e.target.value), setRes(null))}
              lang={lang === "zh" ? "zh-CN" : "en"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={lang === "zh" ? "汉字 / pinyin" : "type the word…"}
              className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-lg focus:border-sky-500 focus:outline-none"
            />
            <button type="submit" disabled={!typed.trim()} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-40">
              Chấm
            </button>
          </form>
          {res && (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-lg font-bold text-white ${res.score === 100 ? "bg-jade-600" : res.score >= 60 ? "bg-amber-500" : "bg-red-600"}`}>{res.score}</span>
                <span className="text-sm font-medium text-stone-800">{res.note}</span>
              </div>
              {res.score < 100 && (
                <p className="text-sm">
                  Bạn viết:{" "}
                  <span className="font-mono text-base">
                    {res.marks.map((m, i) => <span key={i} className={m.ok ? "text-jade-700" : "rounded bg-red-100 text-red-700"}>{m.ch}</span>)}
                  </span>{" "}
                  → Đáp án:{" "}
                  <strong lang={lang === "zh" ? "zh-CN" : "en"} className="font-mono text-base">
                    {res.answer ? res.answer.map((m, i) => <span key={i} className={m.ok ? "" : "rounded bg-amber-200 text-amber-900"}>{m.ch}</span>) : word}
                  </strong>
                  {pinyin && <span className="ml-1 text-brand-700">{pinyin}</span>}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
