"use client";
/**
 * Two extra word games (docs/UI_POLISH_PLAN.md): "Lật thẻ ghép đôi" (memory: find each word's meaning among face-down
 * cards) and "Ghép âm thanh" (hear a word, match it with its meaning). Both use the same dark QuizShell as the rest.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/domain/exercises";
import type { GameWord } from "@/domain/word-game";
import { earnXp } from "@/features/activity/store";
import { QuizButton, QuizShell, QuizTile } from "@/features/quiz/QuizShell";

const rng = Math.random;
export const FLIP_PAIRS = 6;
export const FLIP_XP = 5;

function Term({ lang, word }: { lang: "en" | "zh"; word: GameWord }) {
  return lang === "zh" ? (
    <span lang="zh-CN" className="font-han text-3xl text-white">{word.term}</span>
  ) : (
    <span lang="en" className="text-xl font-bold text-white">{word.term}</span>
  );
}

const pick = (words: GameWord[], n: number) => shuffle(words, rng).slice(0, n);

type Card = { key: string; id: string; side: "term" | "meaning" };

/** Memory game: 6 words → 12 cards. */
export function FlipGame({ lang, words, onExit, onDone }: { lang: "en" | "zh"; words: GameWord[]; onExit: () => void; /** called once per round when every pair is found, with the number of flips */ onDone?: (moves: number) => void }) {
  const [round, setRound] = useState(0);
  const deck = useMemo<{ cards: Card[]; byId: Map<string, GameWord> }>(() => {
    const chosen = pick(words, FLIP_PAIRS);
    const cards: Card[] = chosen.flatMap((w) => [
      { key: `${w.id}-t`, id: w.id, side: "term" as const },
      { key: `${w.id}-m`, id: w.id, side: "meaning" as const },
    ]);
    return { cards: shuffle(cards, rng), byId: new Map(chosen.map((w) => [w.id, w])) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new deck only per round
  }, [round]);
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const paid = useRef(-1);

  const pairs = deck.cards.length / 2;
  const done = found.size === pairs;
  if (done && paid.current !== round) {
    paid.current = round;
    earnXp(FLIP_XP);
  }

  useEffect(() => {
    if (done) onDone?.(moves);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per finished round
  }, [done, round]);

  const flip = (c: Card) => {
    if (open.length >= 2 || open.includes(c.key) || found.has(c.id)) return;
    const next = [...open, c.key];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => deck.cards.find((x) => x.key === k)!);
      if (a!.id === b!.id && a!.side !== b!.side) {
        setFound((f) => new Set(f).add(a!.id));
        setOpen([]);
      } else {
        setWrong(next);
        window.setTimeout(() => {
          setOpen([]);
          setWrong([]);
        }, 900);
      }
    }
  };
  const replay = () => {
    setRound((r) => r + 1);
    setOpen([]);
    setFound(new Set());
    setMoves(0);
    setWrong([]);
  };

  return (
    <QuizShell
      progress={found.size / pairs}
      badge={moves}
      onExit={onExit}
      title={done ? "Hoàn thành! 🎉" : "Lật thẻ ghép đôi"}
      footer={done ? <QuizButton state="ok" onClick={replay}>Chơi lại</QuizButton> : <QuizButton state="disabled">Tìm đủ {pairs} cặp</QuizButton>}
    >
      {done ? (
        <p className="text-xl text-neutral-300">
          Bạn ghép đủ <strong className="text-emerald-400">{pairs}</strong> cặp trong <strong className="text-amber-300">{moves}</strong> lượt lật · +{FLIP_XP} XP
        </p>
      ) : (
        <>
          <p className="mb-4 text-neutral-400">Lật hai thẻ: một thẻ là từ, thẻ kia là nghĩa của nó.</p>
          <ul className="grid grid-cols-3 gap-2">
            {deck.cards.map((c) => {
              const w = deck.byId.get(c.id)!;
              const faceUp = open.includes(c.key) || found.has(c.id);
              const bad = wrong.includes(c.key);
              return (
                <li key={c.key}>
                  <QuizTile
                    state={found.has(c.id) ? "right" : bad ? "wrong" : faceUp ? "selected" : "idle"}
                    disabled={found.has(c.id)}
                    onClick={() => flip(c)}
                    className="!min-h-24 !px-1.5 text-base leading-tight"
                  >
                    {faceUp ? (c.side === "term" ? <Term lang={lang} word={w} /> : <span className="text-sm">{w.meaning}</span>) : <span className="text-3xl text-neutral-600" aria-label="Thẻ úp">?</span>}
                  </QuizTile>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </QuizShell>
  );
}

/** Hear-and-match: speaker tiles on the left, meanings on the right. */
export function AudioMatch({
  words,
  speak,
  onPair,
  onExit,
}: {
  words: GameWord[];
  speak: (text: string, slow?: boolean) => void;
  onPair: (id: string, ok: boolean) => void;
  onExit: () => void;
}) {
  const [round, setRound] = useState(0);
  const set = useMemo(() => pick(words, 5), [words, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = useMemo(() => shuffle(set, rng), [set]);
  const right = useMemo(() => shuffle(set, rng), [set]);
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);
  const finished = done.size === set.length;

  const hear = (w: GameWord) => {
    if (done.has(w.id)) return;
    setSel(w.id);
    speak(w.term);
  };
  const choose = (w: GameWord) => {
    if (!sel || done.has(w.id)) return;
    if (w.id === sel) {
      onPair(sel, !missed.has(sel));
      setDone((d) => new Set(d).add(sel));
      setSel(null);
    } else {
      setMissed((m) => new Set(m).add(sel));
      setFlash(w.id);
      window.setTimeout(() => setFlash(null), 500);
    }
  };
  const replay = () => {
    setRound((r) => r + 1);
    setSel(null);
    setDone(new Set());
    setMissed(new Set());
  };

  return (
    <QuizShell
      progress={done.size / set.length}
      badge={done.size}
      onExit={onExit}
      title="Ghép âm thanh với nghĩa"
      footer={<QuizButton state={finished ? "ok" : "disabled"} onClick={replay}>{finished ? "Chơi tiếp" : "Tiếp theo"}</QuizButton>}
    >
      <p className="mb-4 text-neutral-400">Chạm loa để nghe một từ, rồi chạm nghĩa của nó bên phải.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {left.map((w) => (
            <QuizTile key={w.id} state={done.has(w.id) ? "done" : sel === w.id ? "selected" : "idle"} disabled={done.has(w.id)} onClick={() => hear(w)}>
              <span className="flex items-center gap-2 text-sky-400" aria-label="Nghe">
                <span className="text-2xl">🔊</span>
                <span className="flex h-6 items-center gap-0.5" aria-hidden>
                  {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                    <span key={i} className="w-1 rounded-full bg-sky-500" style={{ height: `${h * 3}px` }} />
                  ))}
                </span>
              </span>
            </QuizTile>
          ))}
        </div>
        <div className="space-y-3">
          {right.map((w) => (
            <QuizTile key={w.id} state={done.has(w.id) ? "done" : flash === w.id ? "wrong" : "idle"} disabled={done.has(w.id)} onClick={() => choose(w)}>
              <span className="text-base">{w.meaning}</span>
            </QuizTile>
          ))}
        </div>
      </div>
    </QuizShell>
  );
}
