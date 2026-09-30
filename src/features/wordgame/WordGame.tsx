"use client";
/**
 * "Học thuộc" mode of the flashcards (docs/NANG_CAP_4_VIEC_PLAN.md, Việc 4): match, choose, listen,
 * type and definition games over the words of the chosen lessons. Language-neutral — the English and
 * Chinese wrappers pass the words, the progress slice and a speak function. Rules live in
 * src/domain/word-game.ts.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect } from "@/domain/en-grade";
import { shuffle } from "@/domain/exercises";
import {
  applyAnswer,
  dayStreak,
  distractors,
  type GameProgress,
  type GameWord,
  isHard,
  isPassed,
  type Kind,
  kindsFor,
  LEVEL_NAMES,
  MAX_QUESTIONS,
  nextQueue,
  planSession,
  summary,
} from "@/domain/word-game";

export interface WordGameProps {
  lang: "en" | "zh";
  words: GameWord[];
  lessons: Array<{ number: number; title: string }>;
  /** lesson numbers the learner has opened */
  studied: Set<number>;
  gp: GameProgress;
  update: (fn: (gp: GameProgress) => GameProgress) => void;
  speak: (text: string, slow?: boolean) => void;
  canListen: boolean;
  lessonLabel: string;
}

type Question = { id: string; kind: Kind; options: GameWord[]; review: boolean; level: number };
type Session = { queue: string[]; review: Set<string>; wrong: Record<string, number>; asked: number; correct: number; passedNow: string[]; match: string[] | null };

const rng = Math.random;
const btn = "rounded-xl px-5 py-3 font-semibold";

export function WordGame(props: WordGameProps) {
  const { lang, words, lessons, studied, gp, update, speak, canListen, lessonLabel } = props;
  const [scope, setScope] = useState<number | "studied" | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; word: GameWord } | null>(null);
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  useEffect(() => {
    if (scope !== null) return;
    const q = Number(new URLSearchParams(window.location.search).get("lesson"));
    setScope(q ? q : studied.size ? "studied" : (lessons[0]?.number ?? 1));
  }, [scope, studied, lessons]);
  useEffect(() => setSession(null), [scope]);

  const inScope = words.filter((w) => (scope === "studied" ? studied.has(w.lesson) : w.lesson === scope));
  const plan = planSession(inScope, gp);
  const hardWords = inScope.filter((w) => isHard(gp.mastery[w.id]));
  const stats = summary(inScope, gp);

  const start = (hardOnly = false) => {
    const p = hardOnly ? planSession(inScope, gp, { hardOnly: true }) : plan;
    const queue = [...p.review, ...p.learn];
    const level0 = queue.filter((id) => !p.review.includes(id) && (gp.mastery[id]?.level ?? 0) === 0).slice(0, 5);
    setSession({ queue, review: new Set(p.review), wrong: {}, asked: 0, correct: 0, passedNow: [], match: level0.length >= 3 ? level0 : null });
    setQuestion(null);
    setFeedback(null);
  };

  // next question whenever the head of the queue changes
  const head = session && !session.match && session.asked < MAX_QUESTIONS ? session.queue[0] : undefined;
  useEffect(() => {
    if (!head || feedback) return;
    const word = byId.get(head)!;
    const level = session!.review.has(head) ? 2 : Math.min(gp.mastery[head]?.level ?? 0, 2);
    const kinds = kindsFor(level, lang, word, canListen);
    const kind = kinds[Math.floor(rng() * kinds.length)]!;
    const options = kind.endsWith("type") || kind === "type-term" ? [] : shuffle([word, ...distractors(word, words, 3, rng)], rng);
    setQuestion({ id: head, kind, options, review: session!.review.has(head), level });
    if (kind === "listen-choose" || kind === "listen-type") speak(word.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head, session?.asked, feedback]);

  const answer = (correct: boolean) => {
    if (!session || !question) return;
    const word = byId.get(question.id)!;
    const wasReview = session.review.has(question.id);
    const after = applyAnswer(gp, question.id, correct);
    update(() => after);
    const passedNow = !wasReview && isPassed(after.mastery[question.id]) ? [...session.passedNow, question.id] : session.passedNow;
    const review = new Set(session.review);
    if (wasReview) review.delete(question.id);
    const wrong = correct ? session.wrong : { ...session.wrong, [question.id]: (session.wrong[question.id] ?? 0) + 1 };
    setFeedback({ ok: correct, word });
    setSession({ ...session, review, wrong, passedNow, asked: session.asked + 1, correct: session.correct + (correct ? 1 : 0), queue: nextQueue(session.queue, after, wasReview, correct, wrong[question.id] ?? 0) });
  };

  if (scope === null) return <p className="text-stone-500">Đang tải…</p>;
  const chip = "rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-inset ring-stone-300";

  return (
    <div className="space-y-5">
      {!session && (
        <>
          <select value={String(scope)} onChange={(e) => setScope(e.target.value === "studied" ? "studied" : Number(e.target.value))} className={chip}>
            <option value="studied" disabled={studied.size === 0}>Các {lessonLabel.toLowerCase()} đã học ({studied.size})</option>
            {lessons.map((l) => (
              <option key={l.number} value={l.number}>{lessonLabel} {l.number}: {l.title}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
            <Stat n={stats.passed} label="Đã thuộc" tone="text-jade-700" />
            <Stat n={stats.learning} label="Đang học" tone="text-sky-700" />
            <Stat n={stats.hard} label="Từ khó" tone="text-red-700" />
            <Stat n={stats.fresh} label="Chưa học" tone="text-stone-700" />
            <Stat n={dayStreak(gp.days)} label="Ngày liên tục" tone="text-amber-700" />
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            {plan.review.length + plan.learn.length ? (
              <>
                <p className="text-stone-700">
                  Hôm nay: ôn <strong>{plan.review.length}</strong> từ đến hạn + học <strong>{plan.learn.length}</strong> từ
                  {plan.fresh ? ` (${plan.fresh} từ mới)` : ""}.
                </p>
                <button type="button" onClick={() => start()} className={`${btn} mt-4 bg-sky-700 text-white hover:bg-sky-800`}>Bắt đầu</button>
              </>
            ) : (
              <p className="text-stone-700">Đã thuộc hết từ trong phạm vi này và chưa đến hạn ôn. Chọn buổi khác hoặc quay lại sau nhé!</p>
            )}
            {hardWords.length > 0 && (
              <button type="button" onClick={() => start(true)} className={`${btn} ml-2 mt-4 bg-red-50 text-red-800 ring-1 ring-inset ring-red-200 hover:bg-red-100`}>
                Học lại Từ khó ({hardWords.length})
              </button>
            )}
            <p className="mx-auto mt-4 max-w-xl text-left text-xs text-stone-500">
              Mỗi từ qua 3 bậc — {LEVEL_NAMES[0]} (nối / chọn từ) → {LEVEL_NAMES[1]} (nghe chọn) → {LEVEL_NAMES[2]} ({lang === "en" ? "nghe gõ lại, gõ từ theo nghĩa" : "nghĩa tiếng Anh → chọn chữ"}); mỗi bậc đúng liền 2 lần. Từ đã thuộc được hẹn ôn sau 3 ngày và không hiện trong lượt lật thẻ đến hạn đó. Sai 3 lần → vào mục Từ khó.
            </p>
          </div>
        </>
      )}

      {session?.match && (
        <MatchRound
          lang={lang}
          words={session.match.map((id) => byId.get(id)!)}
          onPair={(id, ok) => update((g) => applyAnswer(g, id, ok))}
          onDone={() => setSession((s) => (s ? { ...s, match: null } : s))}
        />
      )}

      {session && !session.match && (head === undefined || session.asked >= MAX_QUESTIONS) && !feedback && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-bold text-jade-700">Xong lượt học!</p>
          <p className="mt-1 text-stone-600">
            Đúng {session.correct}/{session.asked} câu · thuộc thêm {session.passedNow.length} từ
            {session.queue.length ? ` · còn ${session.queue.length} từ học tiếp lần sau` : ""}.
          </p>
          {session.passedNow.length > 0 && (
            <p lang={lang === "zh" ? "zh-CN" : "en"} className="mt-2 text-stone-800">{session.passedNow.map((id) => byId.get(id)!.term).join(" · ")}</p>
          )}
          <button type="button" onClick={() => setSession(null)} className={`${btn} mt-4 text-sm font-medium ring-1 ring-inset ring-stone-300 hover:bg-stone-100`}>Về trang đầu</button>
        </div>
      )}

      {session && !session.match && question && (head !== undefined || feedback) && (
        <QuestionCard
          key={`${question.id}-${session.asked - (feedback ? 1 : 0)}`}
          lang={lang}
          q={question}
          word={byId.get(question.id)!}
          remaining={session.queue.length}
          feedback={feedback}
          speak={speak}
          onAnswer={answer}
          onNext={() => setFeedback(null)}
        />
      )}
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white p-2 ring-1 ring-stone-200">
      <p className={`text-lg font-bold ${tone}`}>{n}</p>
      {label}
    </div>
  );
}

function Term({ lang, word, big = false }: { lang: "en" | "zh"; word: GameWord; big?: boolean }) {
  return lang === "zh" ? (
    <span lang="zh-CN" className={`font-han ${big ? "text-6xl" : "text-3xl"} text-stone-900`}>{word.term}</span>
  ) : (
    <span lang="en" className={`${big ? "text-4xl" : "text-lg"} font-bold text-stone-900`}>{word.term}</span>
  );
}

const PROMPTS: Record<Kind, string> = {
  "choose-term": "Chọn từ đúng với nghĩa",
  "choose-meaning": "Chọn nghĩa đúng",
  "listen-choose": "Nghe rồi chọn từ",
  "listen-type": "Nghe rồi gõ lại từ",
  "type-term": "Gõ từ tiếng Anh có nghĩa",
  definition: "Đọc nghĩa tiếng Anh, chọn từ",
};

function QuestionCard(props: {
  lang: "en" | "zh";
  q: Question;
  word: GameWord;
  remaining: number;
  feedback: { ok: boolean; word: GameWord } | null;
  speak: (text: string, slow?: boolean) => void;
  onAnswer: (ok: boolean) => void;
  onNext: () => void;
}) {
  const { lang, q, word, remaining, feedback, speak, onAnswer, onNext } = props;
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) nextRef.current?.focus();
    if (feedback?.ok) {
      const t = setTimeout(onNext, 900);
      return () => clearTimeout(t);
    }
  }, [feedback, onNext]);

  const choose = (w: GameWord) => {
    if (feedback) return;
    setPicked(w.id);
    onAnswer(w.id === word.id);
  };
  const submit = () => {
    if (feedback || !typed.trim()) return;
    onAnswer(isCorrect(typed, word.term));
  };
  const listen = q.kind === "listen-choose" || q.kind === "listen-type";
  const optionLabel = (w: GameWord) => (q.kind === "choose-meaning" ? <span className="text-stone-800">{w.meaning}</span> : <Term lang={lang} word={w} />);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        Còn {remaining} từ trong lượt · {q.review ? "ôn từ đã thuộc" : `bậc ${LEVEL_NAMES[q.level]}`}
      </p>
      <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-stone-500">{PROMPTS[q.kind]}</p>
        <div className="mt-3 flex min-h-24 flex-col items-center justify-center gap-2">
          {q.kind === "choose-term" || q.kind === "type-term" ? <p className="text-2xl font-semibold text-stone-800">{word.meaning}</p> : null}
          {q.kind === "choose-meaning" && (
            <>
              <Term lang={lang} word={word} big />
              {word.reading && <span className="font-mono text-stone-500">{word.reading}</span>}
            </>
          )}
          {q.kind === "definition" && <p lang="en" className="text-xl italic text-stone-800">“{word.definitionEn}”</p>}
          {q.kind === "type-term" && (
            <p className="font-mono text-stone-500">{word.term[0]}{word.term.slice(1).replace(/[^\s-]/g, "_")} ({word.term.replace(/[\s-]/g, "").length} chữ cái)</p>
          )}
          {(listen || q.kind === "choose-meaning") && (
            <div className="flex gap-2">
              <button type="button" onClick={() => speak(word.term)} className="rounded-full bg-sky-50 px-4 py-2 text-sky-800 ring-1 ring-inset ring-sky-200 hover:bg-sky-100">🔊 Nghe</button>
              <button type="button" onClick={() => speak(word.term, true)} className="rounded-full bg-sky-50 px-4 py-2 text-sky-800 ring-1 ring-inset ring-sky-200 hover:bg-sky-100">🐢 Chậm</button>
            </div>
          )}
        </div>

        {q.options.length > 0 && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => {
              const state = feedback ? (o.id === word.id ? "ring-jade-500 bg-jade-50" : o.id === picked ? "ring-red-400 bg-red-50" : "ring-stone-200 opacity-60") : "ring-stone-300 hover:bg-stone-50";
              return (
                <button key={o.id} type="button" disabled={!!feedback} onClick={() => choose(o)} className={`min-h-14 rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ${state}`}>
                  {optionLabel(o)}
                </button>
              );
            })}
          </div>
        )}

        {(q.kind === "listen-type" || q.kind === "type-term") && (
          <form
            className="mx-auto mt-5 flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              autoFocus
              lang="en"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl px-4 py-3 text-lg ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Gõ từ…"
            />
            <button type="submit" disabled={!!feedback} className={`${btn} bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-50`}>Kiểm tra</button>
          </form>
        )}

        {feedback && (
          <div className={`mt-5 rounded-2xl p-4 text-left ${feedback.ok ? "bg-jade-50" : "bg-red-50"}`}>
            <p className={`font-semibold ${feedback.ok ? "text-jade-800" : "text-red-800"}`}>{feedback.ok ? "Đúng rồi!" : "Chưa đúng — đáp án:"}</p>
            <p className="mt-1">
              <Term lang={lang} word={word} /> {word.reading && <span className="ml-2 font-mono text-stone-500">{word.reading}</span>}
            </p>
            <p className="text-stone-700">{word.meaning}</p>
            {!feedback.ok && <p className="mt-1 text-xs text-stone-500">Từ này sẽ quay lại sau vài câu.</p>}
            <button ref={nextRef} type="button" onClick={onNext} className={`${btn} mt-3 bg-stone-900 text-sm text-white hover:bg-stone-700`}>Tiếp →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Nối từ: pick a word on the left, then its meaning on the right. First try right = a correct answer. */
function MatchRound({ lang, words, onPair, onDone }: { lang: "en" | "zh"; words: GameWord[]; onPair: (id: string, ok: boolean) => void; onDone: () => void }) {
  const [right] = useState(() => shuffle(words, rng));
  const [left] = useState(() => shuffle(words, rng));
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const pick = (id: string) => {
    if (!sel) return;
    if (id === sel) {
      onPair(sel, !missed.has(sel));
      const next = new Set(done).add(sel);
      setDone(next);
      setSel(null);
      if (next.size === words.length) setTimeout(onDone, 600);
    } else {
      if (!missed.has(sel)) setMissed(new Set(missed).add(sel));
      setFlash(id);
      setTimeout(() => setFlash(null), 500);
    }
  };
  const cell = "w-full rounded-2xl bg-white px-3 py-3 ring-1 ring-inset text-left";

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">Nối từ với nghĩa: bấm một từ bên trái, rồi bấm nghĩa của nó bên phải.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {left.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={done.has(w.id)}
              onClick={() => setSel(w.id)}
              className={`${cell} ${done.has(w.id) ? "bg-jade-50 ring-jade-400 opacity-60" : sel === w.id ? "ring-2 ring-sky-500" : "ring-stone-300 hover:bg-stone-50"}`}
            >
              <Term lang={lang} word={w} />
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((w) => (
            <button
              key={w.id}
              type="button"
              disabled={done.has(w.id)}
              onClick={() => pick(w.id)}
              className={`${cell} text-sm ${done.has(w.id) ? "bg-jade-50 ring-jade-400 opacity-60" : flash === w.id ? "bg-red-50 ring-red-400" : "ring-stone-300 hover:bg-stone-50"}`}
            >
              {w.meaning}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
