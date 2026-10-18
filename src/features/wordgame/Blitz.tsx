"use client";
/**
 * ⚡ Đua 60 giây: words come one after another, pick the meaning (or the word) as fast as you can.
 * Combo x2…x5 every 3 right answers in a row; a wrong answer takes 3 seconds off the clock. Wrong answers
 * count towards "Từ khó" in the word game; right answers only earn points and XP (a 4-way choice must not
 * move a word up a level). Rules live in src/domain/word-game.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { shuffle } from "@/domain/exercises";
import {
  applyAnswer,
  BLITZ_PENALTY,
  BLITZ_SECONDS,
  blitzMultiplier,
  blitzPick,
  blitzPoints,
  blitzXp,
  distractors,
  type GameProgress,
  type GameWord,
} from "@/domain/word-game";
import { earnXp } from "@/features/activity/store";
import { playRight, playWin, playWrong, setSoundOn, soundOn } from "./feedback";

type Q = { word: GameWord; options: GameWord[]; mode: "term" | "meaning" };
type Miss = { word: GameWord };

const bestKey = (lang: string) => `learn-app:blitz-best:${lang}`;
const readBest = (lang: string) => {
  try {
    return Number(localStorage.getItem(bestKey(lang))) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (lang: string, n: number) => {
  try {
    localStorage.setItem(bestKey(lang), String(n));
  } catch {
    // ignore
  }
};

function Term({ lang, w, big }: { lang: "en" | "zh"; w: GameWord; big?: boolean }) {
  return lang === "zh" ? (
    <span lang="zh-CN" className={`font-han ${big ? "text-6xl" : "text-3xl"} text-stone-900`}>{w.term}</span>
  ) : (
    <span lang="en" className={`${big ? "text-4xl" : "text-xl"} font-bold text-stone-900`}>{w.term}</span>
  );
}

export function Blitz({
  lang,
  words,
  gp,
  update,
  speak,
  onExit,
}: {
  lang: "en" | "zh";
  words: GameWord[];
  gp: GameProgress;
  update: (fn: (gp: GameProgress) => GameProgress) => void;
  speak: (text: string, slow?: boolean) => void;
  onExit: () => void;
}) {
  const rng = Math.random;
  const [phase, setPhase] = useState<"ready" | "run" | "over">("ready");
  const [left, setLeft] = useState(BLITZ_SECONDS);
  const [q, setQ] = useState<Q | null>(null);
  const [picked, setPicked] = useState<{ id: string; ok: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [best, setBest] = useState(0);
  const [sound, setSound] = useState(true);
  const [penalty, setPenalty] = useState(false);
  const lastId = useRef<string | undefined>(undefined);
  const gpRef = useRef(gp);
  gpRef.current = gp;
  const deadline = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    setBest(readBest(lang));
    setSound(soundOn());
  }, [lang]);

  const next = useCallback(() => {
    const word = blitzPick(words, gpRef.current, rng, lastId.current);
    lastId.current = word.id;
    const mode: Q["mode"] = rng() < 0.5 ? "term" : "meaning";
    setQ({ word, mode, options: shuffle([word, ...distractors(word, words, 3, rng)], rng) });
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  const start = () => {
    finished.current = false;
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setCorrect(0);
    setMisses([]);
    setLeft(BLITZ_SECONDS);
    deadline.current = performance.now() + BLITZ_SECONDS * 1000;
    lastId.current = undefined;
    setPhase("run");
    next();
  };

  // the clock
  useEffect(() => {
    if (phase !== "run") return;
    const t = window.setInterval(() => {
      const s = Math.max(0, (deadline.current - performance.now()) / 1000);
      setLeft(s);
      if (s <= 0) setPhase("over");
    }, 100);
    return () => window.clearInterval(t);
  }, [phase]);

  // finishing: best score, XP, fanfare — once
  useEffect(() => {
    if (phase !== "over" || finished.current) return;
    finished.current = true;
    earnXp(blitzXp(correct));
    if (score > best) {
      saveBest(lang, score);
      setBest(score);
    }
    if (correct > 0) playWin();
  }, [phase, correct, score, best, lang]);

  const choose = (w: GameWord) => {
    if (phase !== "run" || picked || !q) return;
    const ok = w.id === q.word.id;
    setPicked({ id: w.id, ok });
    if (ok) {
      playRight(combo);
      setScore((s) => s + blitzPoints(combo));
      setCombo(combo + 1);
      setBestCombo((b) => Math.max(b, combo + 1));
      setCorrect((c) => c + 1);
      window.setTimeout(next, 250);
    } else {
      playWrong();
      deadline.current -= BLITZ_PENALTY * 1000;
      setPenalty(true);
      window.setTimeout(() => setPenalty(false), 600);
      setCombo(0);
      setMisses((m) => (m.some((x) => x.word.id === q.word.id) ? m : [...m, { word: q.word }]));
      update((g) => applyAnswer(g, q.word.id, false));
      window.setTimeout(next, 900);
    }
  };

  const mult = blitzMultiplier(combo);
  const pct = Math.max(0, Math.min(100, (left / BLITZ_SECONDS) * 100));
  if (phase === "ready") {
    return (
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>⚡</p>
        <h2 className="mt-1 text-2xl font-extrabold text-stone-900">Đua {BLITZ_SECONDS} giây</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-700">
          Trả lời càng nhanh càng tốt. Đúng 3 câu liên tiếp thì điểm nhân thêm (tối đa x5). Sai bị trừ {BLITZ_PENALTY} giây và mất combo.
        </p>
        <p className="mt-2 text-sm text-stone-600">Kỷ lục của bạn: <strong>{best}</strong> điểm</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={start} className="rounded-xl bg-orange-600 px-8 py-3 text-lg font-bold text-white hover:bg-orange-700">Bắt đầu!</button>
          <button type="button" onClick={onExit} className="rounded-xl px-5 py-3 font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-white">Quay lại</button>
        </div>
        <label className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundOn(e.target.checked); }} /> Âm thanh và rung
        </label>
      </div>
    );
  }

  if (phase === "over") {
    const isBest = score > 0 && score >= best;
    return (
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Hết giờ!</p>
        <p className="text-6xl font-extrabold text-orange-600">{score}</p>
        <p className="text-stone-700">
          Đúng <strong>{correct}</strong> từ · combo cao nhất <strong>x{blitzMultiplier(bestCombo)}</strong> ({bestCombo} liền) · +{blitzXp(correct)} XP
        </p>
        {isBest && score > 0 && <p className="font-bold text-jade-700">🏆 Kỷ lục mới!</p>}
        {misses.length > 0 && (
          <div className="mx-auto max-w-md rounded-xl bg-red-50 p-3 text-left">
            <p className="text-sm font-semibold text-red-800">Từ cần ôn lại ({misses.length}) — đã tính vào “Từ khó”:</p>
            <ul className="mt-1 space-y-1 text-sm">
              {misses.map(({ word }) => (
                <li key={word.id} className="flex items-center gap-2">
                  <button type="button" onClick={() => speak(word.term)} aria-label={`Nghe ${word.term}`} className="rounded-full px-1.5 hover:bg-white">🔊</button>
                  <span lang={lang === "zh" ? "zh-CN" : "en"} className="font-semibold">{word.term}</span>
                  {word.reading && <span className="font-mono text-stone-500">{word.reading}</span>}
                  <span className="text-stone-700">— {word.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={start} className="rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-700">Chơi lại</button>
          <button type="button" onClick={onExit} className="rounded-xl px-5 py-3 font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-50">Xong</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-stone-700">Điểm <span className="text-xl text-orange-600">{score}</span></span>
        <span className={`rounded-full px-3 py-0.5 ${mult > 1 ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-600"}`}>Combo {combo} · x{mult}</span>
        <span className={penalty ? "text-red-600" : "text-stone-700"}>{penalty ? `−${BLITZ_PENALTY}s ` : ""}{Math.ceil(left)}s</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={Math.ceil(left)} aria-valuemax={BLITZ_SECONDS} aria-label="Thời gian còn lại">
        <div className={`h-full rounded-full transition-[width] duration-100 ${left < 10 ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
      </div>
      {q && (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-medium text-stone-500">{q.mode === "term" ? "Chọn từ đúng với nghĩa" : "Chọn nghĩa đúng"}</p>
          <div className="mt-2 flex min-h-20 flex-col items-center justify-center gap-1">
            {q.mode === "term" ? (
              <p className="text-2xl font-semibold text-stone-800">{q.word.meaning}</p>
            ) : (
              <>
                <Term lang={lang} w={q.word} big />
                {q.word.reading && <span className="font-mono text-stone-500">{q.word.reading}</span>}
              </>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => {
              const state = picked
                ? o.id === q.word.id
                  ? "bg-jade-50 ring-jade-500"
                  : o.id === picked.id
                    ? "bg-red-50 ring-red-400"
                    : "opacity-50 ring-stone-200"
                : "ring-stone-300 hover:bg-stone-50 active:bg-stone-100";
              return (
                <button key={o.id} type="button" disabled={!!picked} onClick={() => choose(o)} className={`min-h-14 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-inset ${state}`}>
                  {q.mode === "term" ? <Term lang={lang} w={o} /> : <span className="text-stone-800">{o.meaning}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-center text-xs text-stone-400">Trả lời sai sẽ được ghi vào Từ khó để ôn lại.</p>
    </div>
  );
}
