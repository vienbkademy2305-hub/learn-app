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
import { QuizButton, QuizShell, QuizTile } from "@/features/quiz/QuizShell";
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
    <span lang="zh-CN" className={`font-han ${big ? "text-6xl" : "text-3xl"} text-white`}>{w.term}</span>
  ) : (
    <span lang="en" className={`${big ? "text-4xl" : "text-xl"} font-bold text-white`}>{w.term}</span>
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
      <QuizShell
        progress={0}
        onExit={onExit}
        title={`⚡ Đua ${BLITZ_SECONDS} giây`}
        footer={<QuizButton onClick={start}>Bắt đầu!</QuizButton>}
      >
        <p className="text-lg text-neutral-300">
          Trả lời càng nhanh càng tốt. Đúng 3 câu liên tiếp thì điểm nhân thêm (tối đa x5). Sai bị trừ {BLITZ_PENALTY} giây và mất combo.
        </p>
        <p className="mt-4 text-neutral-400">Kỷ lục của bạn: <strong className="text-amber-300">{best}</strong> điểm</p>
        <label className="mt-6 flex items-center gap-3 text-neutral-300">
          <input type="checkbox" className="size-5" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundOn(e.target.checked); }} /> Âm thanh và rung
        </label>
      </QuizShell>
    );
  }

  if (phase === "over") {
    const isBest = score > 0 && score >= best;
    return (
      <QuizShell
        progress={1}
        onExit={onExit}
        title="Hết giờ!"
        footer={
          <div className="flex w-full flex-col gap-1">
            <QuizButton onClick={start}>Chơi lại</QuizButton>
            <button type="button" onClick={onExit} className="h-10 text-lg font-bold text-neutral-500 hover:text-neutral-300">Xong</button>
          </div>
        }
      >
        <div className="text-center">
          <p className="text-7xl font-extrabold text-amber-300">{score}</p>
          <p className="mt-3 text-lg text-neutral-300">
            Đúng <strong className="text-emerald-400">{correct}</strong> từ · combo cao nhất <strong className="text-amber-300">x{blitzMultiplier(bestCombo)}</strong> ({bestCombo} liền) · +{blitzXp(correct)} XP
          </p>
          {isBest && score > 0 && <p className="mt-3 text-xl font-extrabold text-emerald-400">🏆 Kỷ lục mới!</p>}
        </div>
        {misses.length > 0 && (
          <div className="mt-6 rounded-3xl bg-red-950 p-4">
            <p className="font-bold text-red-300">Từ cần ôn lại ({misses.length}) — đã tính vào “Từ khó”:</p>
            <ul className="mt-2 space-y-2 text-lg">
              {misses.map(({ word }) => (
                <li key={word.id} className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => speak(word.term)} aria-label={`Nghe ${word.term}`} className="rounded-full px-1.5 hover:bg-black/30">🔊</button>
                  <span lang={lang === "zh" ? "zh-CN" : "en"} className="font-bold text-white">{word.term}</span>
                  {word.reading && <span className="font-mono text-neutral-400">{word.reading}</span>}
                  <span className="text-neutral-300">— {word.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </QuizShell>
    );
  }

  return (
    <QuizShell
      progress={pct / 100}
      badge={correct}
      onExit={onExit}
      top={
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Điểm <span className="text-2xl text-amber-300">{score}</span></span>
          <span className={`rounded-full px-3 py-0.5 text-base ${mult > 1 ? "bg-amber-400 text-black" : "bg-neutral-800 text-neutral-300"}`}>Combo {combo} · x{mult}</span>
          <span className={penalty ? "text-red-400" : "text-neutral-200"}>{penalty ? `−${BLITZ_PENALTY}s ` : ""}{Math.ceil(left)}s</span>
        </div>
      }
      title={q ? (q.mode === "term" ? "Chọn từ đúng với nghĩa" : "Chọn nghĩa đúng") : undefined}
      footer={<QuizButton state="disabled">Tiếp theo</QuizButton>}
    >
      {q && (
        <div className="space-y-5">
          <div className="min-h-20">
            {q.mode === "term" ? (
              <p className="text-2xl font-semibold text-neutral-200">{q.word.meaning}</p>
            ) : (
              <>
                <Term lang={lang} w={q.word} big />
                {q.word.reading && <p className="mt-1 font-mono text-lg text-neutral-400">{q.word.reading}</p>}
              </>
            )}
          </div>
          <div className={`grid gap-3 ${q.mode === "term" ? "grid-cols-2" : "grid-cols-1"}`}>
            {q.options.map((o) => {
              const state = picked ? (o.id === q.word.id ? "right" : o.id === picked.id ? "wrong" : "dim") : "idle";
              return (
                <QuizTile key={o.id} state={state} outline={q.mode !== "term"} disabled={!!picked} onClick={() => choose(o)}>
                  {q.mode === "term" ? <Term lang={lang} w={o} /> : <span>{o.meaning}</span>}
                </QuizTile>
              );
            })}
          </div>
          <p className="text-center text-sm text-neutral-500">Trả lời sai sẽ được ghi vào Từ khó để ôn lại.</p>
        </div>
      )}
    </QuizShell>
  );
}
