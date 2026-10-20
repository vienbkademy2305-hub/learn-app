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
import { earnXp } from "@/features/activity/store";
import { QuizKeyboard } from "@/features/quiz/QuizKeyboard";
import { FeedbackPanel, QuizButton, QuizShell, QuizTile } from "@/features/quiz/QuizShell";
import { Blitz } from "./Blitz";
import { AudioMatch, FlipGame } from "./MiniGames";
import { playRight, playWin, playWrong } from "./feedback";
import {
  applyAnswer,
  BLITZ_MIN_WORDS,
  BOSS_HEARTS,
  BOSS_HITS,
  BOSS_XP,
  bossHp,
  clozeParts,
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
  NEW_PER_SESSION,
  nextQueue,
  planSession,
  scrambleOf,
  summary,
} from "@/domain/word-game";

export interface WordGameProps {
  lang: "en" | "zh";
  words: GameWord[];
  /** `number` identifies the lesson in GameWord.lesson; `label` replaces "<lessonLabel> <number>" in the picker */
  lessons: Array<{ number: number; label?: string; title: string }>;
  /** lesson numbers the learner has opened */
  studied: Set<number>;
  gp: GameProgress;
  update: (fn: (gp: GameProgress) => GameProgress) => void;
  speak: (text: string, slow?: boolean) => void;
  canListen: boolean;
  lessonLabel: string;
  /** Inside a lesson (F4): only that lesson's words, no lesson picker. */
  lockLesson?: number;
}

type Question = { id: string; kind: Kind; options: GameWord[]; review: boolean; level: number; /** true-false: the meaning shown (right or wrong) */ shown?: GameWord; /** scramble: the letters in a different order */ scramble?: string[] };
type Session = {
  queue: string[];
  review: Set<string>;
  wrong: Record<string, number>;
  asked: number;
  correct: number;
  passedNow: string[];
  match: string[] | null;
  /** 👾 boss battle over the hard words: hearts left, queue length at the start, result */
  boss?: { hearts: number; /** hits needed to win: BOSS_HITS per word */ total: number; hits: Record<string, number>; won?: boolean };
};

const rng = Math.random;
const btn = "rounded-xl px-5 py-3 font-semibold";

export function WordGame(props: WordGameProps) {
  const { lang, words, lessons, studied, gp, update, speak, canListen, lessonLabel, lockLesson } = props;
  const [scope, setScope] = useState<number | "studied" | "all" | null>(null);
  const [perSession, setPerSession] = useState(NEW_PER_SESSION);
  const [mode, setMode] = useState<null | "flip" | "audio">(null);
  const [session, setSession] = useState<Session | null>(null);
  const [blitz, setBlitz] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; word: GameWord } | null>(null);
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  useEffect(() => {
    if (scope !== null) return;
    if (lockLesson !== undefined) return setScope(lockLesson);
    const q = Number(new URLSearchParams(window.location.search).get("lesson"));
    setScope(q ? q : studied.size ? "studied" : (lessons[0]?.number ?? 1));
  }, [scope, studied, lessons, lockLesson]);
  useEffect(() => setSession(null), [scope]);

  const inScope = words.filter((w) => (scope === "all" ? true : scope === "studied" ? studied.has(w.lesson) : w.lesson === scope));
  const plan = planSession(inScope, gp, { newCount: perSession });
  const maxQuestions = Math.max(MAX_QUESTIONS, perSession * 6);
  const hardWords = inScope.filter((w) => isHard(gp.mastery[w.id]));
  const stats = summary(inScope, gp);

  const start = (hardOnly = false) => {
    const p = hardOnly ? planSession(inScope, gp, { hardOnly: true }) : plan;
    const queue = [...p.review, ...p.learn];
    const level0 = queue.filter((id) => !p.review.includes(id) && (gp.mastery[id]?.level ?? 0) === 0).slice(0, 5);
    setSession({
      queue,
      review: new Set(p.review),
      wrong: {},
      asked: 0,
      correct: 0,
      passedNow: [],
      match: level0.length >= 3 ? level0 : null,
      boss: hardOnly ? { hearts: BOSS_HEARTS, total: queue.length * BOSS_HITS, hits: {} } : undefined,
    });
    setQuestion(null);
    setFeedback(null);
  };

  // next question whenever the head of the queue changes
  const bossOver = !!session?.boss && (session.boss.hearts <= 0 || session.boss.won === true);
  const head = session && !session.match && !bossOver && session.asked < maxQuestions ? session.queue[0] : undefined;
  useEffect(() => {
    if (!head || feedback) return;
    const word = byId.get(head)!;
    const level = session!.review.has(head) ? 2 : Math.min(gp.mastery[head]?.level ?? 0, 2);
    const kinds = kindsFor(level, lang, word, canListen);
    const kind = kinds[Math.floor(rng() * kinds.length)]!;
    const noOptions = kind.endsWith("type") || kind === "type-term" || kind === "true-false" || kind === "scramble";
    const options = noOptions ? [] : shuffle([word, ...distractors(word, words, 3, rng)], rng);
    const shown = kind === "true-false" ? (rng() < 0.5 ? word : (distractors(word, words, 1, rng)[0] ?? word)) : undefined;
    const scramble = kind === "scramble" ? (scrambleOf(word.term, rng) ?? undefined) : undefined;
    setQuestion({ id: head, kind: kind === "scramble" && !scramble ? "type-term" : kind, options, review: session!.review.has(head), level, shown, scramble });
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
    let queue = nextQueue(session.queue, after, wasReview, correct, wrong[question.id] ?? 0);
    let boss = session.boss;
    if (boss) {
      // Boss battle: a word is beaten after BOSS_HITS right answers in this battle, whatever its level.
      const hits = correct ? { ...boss.hits, [question.id]: (boss.hits[question.id] ?? 0) + 1 } : boss.hits;
      if ((hits[question.id] ?? 0) >= BOSS_HITS) queue = session.queue.slice(1);
      const hearts = boss.hearts - (correct ? 0 : 1);
      const won = queue.length === 0 && hearts > 0;
      boss = { ...boss, hearts, hits, won: won || undefined };
      if (won) {
        earnXp(BOSS_XP);
        playWin();
      } else if (correct) playRight(0);
      else playWrong();
    } else if (correct) playRight(0);
    else playWrong();
    setSession({ ...session, boss, review, wrong, passedNow, asked: session.asked + 1, correct: session.correct + (correct ? 1 : 0), queue });
  };

  if (scope === null) return <p className="text-stone-500">Đang tải…</p>;
  const chip = "rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-inset ring-stone-300";

  return (
    <div className="space-y-5">
      {mode === "flip" && <FlipGame lang={lang} words={inScope} onExit={() => setMode(null)} />}
      {mode === "audio" && canListen && (
        <AudioMatch words={inScope} speak={speak} onPair={(id, ok) => update((g) => applyAnswer(g, id, ok))} onExit={() => setMode(null)} />
      )}
      {blitz && <Blitz lang={lang} words={inScope} gp={gp} update={update} speak={speak} onExit={() => setBlitz(false)} />}

      {!session && !blitz && !mode && (
        <>
          {lockLesson === undefined && (
            <select value={String(scope)} onChange={(e) => setScope(e.target.value === "studied" ? "studied" : e.target.value === "all" ? "all" : Number(e.target.value))} className={chip}>
              <option value="all">Tất cả từ vựng ({words.length} từ)</option>
              <option value="studied" disabled={studied.size === 0}>Các {lessonLabel.toLowerCase()} đã học ({studied.size})</option>
              {lessons.map((l) => (
                <option key={l.number} value={l.number}>{l.label ?? `${lessonLabel} ${l.number}`}: {l.title}</option>
              ))}
            </select>
          )}
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
              <p className="text-stone-700">Đã thuộc hết từ trong phạm vi này và chưa đến hạn ôn. {lockLesson === undefined ? "Chọn buổi khác hoặc quay lại sau nhé!" : "Quay lại sau để ôn nhé!"}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-stone-600">
              Từ mới mỗi lượt:
              {[10, 20, 30].map((n) => (
                <button key={n} type="button" aria-pressed={perSession === n} onClick={() => setPerSession(n)} className={`rounded-lg px-3 py-1.5 font-semibold ring-1 ring-inset ${perSession === n ? "bg-sky-700 text-white ring-sky-700" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"}`}>{n}</button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {inScope.length >= 6 && (
                <button type="button" onClick={() => setMode("flip")} className={`${btn} bg-violet-600 text-white hover:bg-violet-700`}>🃏 Lật thẻ ghép đôi</button>
              )}
              {canListen && inScope.length >= 4 && (
                <button type="button" onClick={() => setMode("audio")} className={`${btn} bg-sky-600 text-white hover:bg-sky-700`}>🔊 Ghép âm thanh</button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {inScope.length >= BLITZ_MIN_WORDS && (
                <button type="button" onClick={() => setBlitz(true)} className={`${btn} bg-orange-500 text-white hover:bg-orange-600`}>
                  ⚡ Đua 60 giây
                </button>
              )}
              {hardWords.length > 0 && (
                <button type="button" onClick={() => start(true)} className={`${btn} bg-red-50 text-red-800 ring-1 ring-inset ring-red-200 hover:bg-red-100`}>
                  👾 Đánh boss: Từ khó ({hardWords.length})
                </button>
              )}
            </div>
            <p className="mx-auto mt-4 max-w-xl text-left text-xs text-stone-500">
              Mỗi từ qua 3 bậc — {LEVEL_NAMES[0]} (nối / chọn từ) → {LEVEL_NAMES[1]} (nghe chọn) → {LEVEL_NAMES[2]} ({lang === "en" ? "nghe gõ lại, gõ từ theo nghĩa" : "nghĩa tiếng Anh → chọn chữ"}); mỗi bậc đúng liền 2 lần. Từ đã thuộc được hẹn ôn sau 3 ngày và không hiện trong lượt lật thẻ đến hạn đó. Sai 3 lần → vào mục Từ khó.
            </p>
          </div>
        </>
      )}

      {session && !blitz && (() => {
        const total = session.asked + session.queue.length;
        const shell = { progress: total ? session.asked / total : 0, badge: session.correct, onExit: () => setSession(null), top: session.boss ? <BossBar boss={session.boss} /> : undefined };
        if (session.match) {
          return (
            <MatchRound
              lang={lang}
              shell={shell}
              words={session.match.map((id) => byId.get(id)!)}
              onPair={(id, ok) => update((g) => applyAnswer(g, id, ok))}
              onDone={() => setSession((s) => (s ? { ...s, match: null } : s))}
            />
          );
        }
        if ((head === undefined || session.asked >= maxQuestions) && !feedback) {
          const lost = session.boss && !session.boss.won;
          return (
            <QuizShell {...shell} progress={1} title={session.boss ? (lost ? "💀 Boss thắng" : "🏆 Hạ boss!") : "Xong lượt học!"} footer={<QuizButton state="ok" onClick={() => setSession(null)}>Về trang đầu</QuizButton>}>
              <p className="text-xl text-neutral-300">
                {session.boss?.won ? `+${BOSS_XP} XP. ` : lost ? "Hết tim — đánh lại nhé! " : ""}
                Đúng <strong className="text-emerald-400">{session.correct}</strong>/{session.asked} câu · thuộc thêm <strong className="text-amber-300">{session.passedNow.length}</strong> từ
                {session.queue.length ? ` · còn ${session.queue.length} từ học tiếp lần sau` : ""}.
              </p>
              {session.passedNow.length > 0 && (
                <p lang={lang === "zh" ? "zh-CN" : "en"} className="mt-4 text-2xl leading-relaxed text-white">{session.passedNow.map((id) => byId.get(id)!.term).join(" · ")}</p>
              )}
            </QuizShell>
          );
        }
        if (question && (head !== undefined || feedback)) {
          return (
            <QuestionCard
              key={`${question.id}-${session.asked - (feedback ? 1 : 0)}`}
              lang={lang}
              shell={shell}
              q={question}
              word={byId.get(question.id)!}
              feedback={feedback}
              speak={speak}
              onAnswer={answer}
              onNext={() => setFeedback(null)}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}

function BossBar({ boss }: { boss: NonNullable<Session["boss"]> }) {
  const done = Object.values(boss.hits).reduce((a, b) => a + b, 0);
  const hp = bossHp(boss.total - done, boss.total);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white">
      <span className="text-3xl" aria-hidden>👾</span>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-xs font-semibold">
          <span>Boss Từ khó</span>
          <span>{Math.round(hp * 100)}% máu</span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-700" role="progressbar" aria-valuenow={Math.round(hp * 100)} aria-valuemax={100} aria-label="Máu của boss">
          <div className="h-full rounded-full bg-red-500 transition-[width] duration-300" style={{ width: `${hp * 100}%` }} />
        </div>
      </div>
      <span className="text-lg tracking-widest" aria-label={`${boss.hearts} tim`}>
        {"❤️".repeat(Math.max(0, boss.hearts))}
        {"🖤".repeat(Math.max(0, BOSS_HEARTS - boss.hearts))}
      </span>
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
    <span lang="zh-CN" className={`font-han ${big ? "text-6xl" : "text-3xl"} text-white`}>{word.term}</span>
  ) : (
    <span lang="en" className={`${big ? "text-4xl" : "text-xl"} font-bold text-white`}>{word.term}</span>
  );
}

const PROMPTS: Record<Kind, string> = {
  "choose-term": "Chọn từ đúng với nghĩa",
  "choose-meaning": "Chọn bản dịch",
  "listen-choose": "Nghe rồi chọn từ",
  "listen-type": "Nghe rồi gõ lại từ",
  "type-term": "Nhập vào bản dịch",
  definition: "Đọc nghĩa tiếng Anh, chọn từ",
  "true-false": "Đúng hay sai?",
  scramble: "Sắp xếp lại các chữ cái",
  cloze: "Điền từ vào câu",
  "cloze-type": "Gõ từ còn thiếu trong câu",
};

type ShellProps = { progress: number; badge: number; onExit: () => void; top?: React.ReactNode };

const BLANK = "＿＿＿＿";

/** The example sentence with the term replaced by a blank (or, after answering, highlighted). */
function ClozeSentence({ word, lang, reveal }: { word: GameWord; lang: "en" | "zh"; reveal: boolean }) {
  const parts = clozeParts(word, lang);
  if (!parts) return null;
  return (
    <div className="rounded-3xl bg-neutral-900 p-5">
      <p lang={lang === "zh" ? "zh-CN" : "en"} className={`${lang === "zh" ? "font-han text-3xl" : "text-2xl"} font-bold leading-snug`}>
        {parts.before}
        <span className={reveal ? "rounded-lg bg-emerald-900 px-1.5 text-emerald-300" : "text-sky-300"}>{reveal ? parts.match : BLANK}</span>
        {parts.after}
      </p>
      {word.example?.vi && <p className="mt-3 text-neutral-400">{word.example.vi}</p>}
    </div>
  );
}

function QuestionCard(props: {
  lang: "en" | "zh";
  shell: ShellProps;
  q: Question;
  word: GameWord;
  feedback: { ok: boolean; word: GameWord } | null;
  speak: (text: string, slow?: boolean) => void;
  onAnswer: (ok: boolean) => void;
  onNext: () => void;
}) {
  const { lang, shell, q, word, feedback, speak, onAnswer, onNext } = props;
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [helped, setHelped] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (feedback) nextRef.current?.focus();
    if (feedback?.ok) {
      const t = setTimeout(onNext, 1100);
      return () => clearTimeout(t);
    }
  }, [feedback, onNext]);

  const choose = (w: GameWord) => {
    if (feedback) return;
    setPicked(w.id);
    onAnswer(w.id === word.id);
  };
  const answerTf = (saysTrue: boolean) => {
    if (feedback) return;
    setPicked(saysTrue ? "yes" : "no");
    onAnswer(saysTrue === (q.shown?.id === word.id));
  };
  const typing = q.kind === "listen-type" || q.kind === "type-term" || q.kind === "cloze-type";
  const letters = q.scramble ?? [];
  const target = word.term.toLowerCase();
  const submit = () => {
    if (feedback) return;
    if (q.kind === "scramble") {
      if (built.length !== letters.length) return;
      return onAnswer(built.map((i) => letters[i]).join("") === target);
    }
    if (!typed.trim()) return;
    // using "Trợ giúp" counts as a miss: the word comes back later
    onAnswer(helped === 0 && isCorrect(typed, word.term));
  };
  const hint = () => {
    if (feedback) return;
    const n = Math.min(word.term.length, helped + 1);
    setHelped(n);
    setTyped(word.term.slice(0, n));
  };
  const listen = q.kind === "listen-choose" || q.kind === "listen-type";
  const optionLabel = (w: GameWord) => (q.kind === "choose-meaning" ? <span>{w.meaning}</span> : <Term lang={lang} word={w} />);
  const slotCount = word.term.replace(/[\s-]/g, "").length;
  const ready = q.kind === "scramble" ? built.length === letters.length : !!typed.trim();

  const footer = feedback ? (
    <QuizButton buttonRef={nextRef} state={feedback.ok ? "ok" : "bad"} onClick={onNext}>Tiếp theo</QuizButton>
  ) : typing || q.kind === "scramble" ? (
    <QuizButton state={ready ? "idle" : "disabled"} onClick={submit}>Kiểm tra</QuizButton>
  ) : (
    <QuizButton state="disabled">Tiếp theo</QuizButton>
  );
  const speakers = (
    <div className="mt-5 flex gap-3">
      <button type="button" onClick={() => speak(word.term)} className="grid h-14 min-w-14 place-items-center rounded-full bg-sky-500/15 px-5 text-lg font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🔊 Nghe</button>
      <button type="button" onClick={() => speak(word.term, true)} className="grid h-14 min-w-14 place-items-center rounded-full bg-sky-500/15 px-5 text-lg font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🐢 Chậm</button>
    </div>
  );

  return (
    <QuizShell {...shell} tag={q.review ? "Đã đến lúc để ôn lại" : undefined} title={PROMPTS[q.kind]} footer={footer}>
      <div className="space-y-5">
        <div>
          {(q.kind === "choose-term" || q.kind === "type-term" || q.kind === "scramble") && <p className="text-2xl font-semibold text-neutral-200">{word.meaning}</p>}
          {q.kind === "choose-meaning" && (
            <>
              <Term lang={lang} word={word} big />
              {word.reading && <p className="mt-1 font-mono text-lg text-neutral-400">{word.reading}</p>}
            </>
          )}
          {q.kind === "definition" && <p lang="en" className="text-2xl italic text-neutral-200">“{word.definitionEn}”</p>}
          {q.kind === "true-false" && q.shown && (
            <div className="rounded-3xl bg-neutral-900 p-5 text-center">
              <Term lang={lang} word={word} big />
              {word.reading && <p className="mt-1 font-mono text-lg text-neutral-400">{word.reading}</p>}
              <p className="my-3 text-3xl text-neutral-600" aria-hidden>=</p>
              <p className="text-2xl font-semibold text-neutral-100">{q.shown.meaning}</p>
            </div>
          )}
          {(q.kind === "cloze" || q.kind === "cloze-type") && <ClozeSentence word={word} lang={lang} reveal={!!feedback} />}
          {(listen || q.kind === "choose-meaning") && speakers}
        </div>

        {q.kind === "true-false" && (
          <div className="grid grid-cols-2 gap-3">
            <QuizTile outline state={feedback ? ((q.shown?.id === word.id) ? "right" : picked === "yes" ? "wrong" : "dim") : "idle"} disabled={!!feedback} onClick={() => answerTf(true)}>
              <span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-emerald-500 text-white">✓</span> Đúng</span>
            </QuizTile>
            <QuizTile outline state={feedback ? ((q.shown?.id !== word.id) ? "right" : picked === "no" ? "wrong" : "dim") : "idle"} disabled={!!feedback} onClick={() => answerTf(false)}>
              <span className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-red-100 text-red-600">✕</span> Sai</span>
            </QuizTile>
          </div>
        )}

        {q.options.length > 0 && (
          <div className={`grid gap-3 ${q.kind === "choose-meaning" ? "grid-cols-1" : "grid-cols-2"}`}>
            {q.options.map((o) => {
              const state = feedback ? (o.id === word.id ? "right" : o.id === picked ? "wrong" : "dim") : "idle";
              return (
                <QuizTile key={o.id} state={state} outline={q.kind === "choose-meaning"} disabled={!!feedback} onClick={() => choose(o)}>
                  {optionLabel(o)}
                </QuizTile>
              );
            })}
          </div>
        )}

        {q.kind === "scramble" && (
          <div className="space-y-4">
            <p className="flex min-h-16 flex-wrap justify-center gap-2 rounded-3xl bg-neutral-900 p-3" aria-label="Từ đang xếp">
              {letters.map((_, slot) => {
                const idx = built[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!!feedback || idx === undefined}
                    onClick={() => setBuilt((b) => b.slice(0, slot))}
                    className="grid size-12 place-items-center rounded-xl border-b-4 border-neutral-600 bg-neutral-800 text-2xl font-bold uppercase text-white"
                  >
                    {idx === undefined ? "" : letters[idx]}
                  </button>
                );
              })}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {letters.map((ch, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!!feedback || built.includes(i)}
                  onClick={() => setBuilt((b) => [...b, i])}
                  className="grid size-14 place-items-center rounded-2xl bg-sky-500 text-3xl font-extrabold uppercase text-white transition active:scale-95 disabled:bg-neutral-900 disabled:text-neutral-700"
                >
                  {ch}
                </button>
              ))}
            </div>
            {!feedback && built.length > 0 && (
              <div className="flex justify-center">
                <button type="button" onClick={() => setBuilt((b) => b.slice(0, -1))} className="h-12 rounded-full bg-neutral-900 px-8 text-lg font-bold text-sky-400 hover:bg-neutral-800">⌫ Xóa chữ cuối</button>
              </div>
            )}
          </div>
        )}

        {typing && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {q.kind !== "cloze-type" && (
              <p className="flex flex-wrap justify-center gap-x-1 font-mono text-3xl tracking-widest text-neutral-300" aria-hidden>
                {[...word.term].map((ch, i) =>
                  /[\s-]/.test(ch) ? <span key={i} className="w-4" /> : <span key={i} className="border-b-2 border-neutral-600 px-1 text-white">{typed[i] ?? " "}</span>,
                )}
              </p>
            )}
            <input
              autoFocus
              lang={lang === "zh" ? "zh-CN" : "en"}
              aria-label="Gõ từ"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!!feedback}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode={lang === "en" ? "none" : undefined}
              placeholder={`Gõ từ (${slotCount} ${lang === "zh" ? "chữ" : "chữ cái"})…`}
              className="h-14 w-full rounded-2xl bg-neutral-900 px-4 text-center text-xl text-white ring-1 ring-neutral-700 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {!feedback && (
              <div className="flex justify-center">
                <button type="button" onClick={hint} className="h-14 rounded-full bg-neutral-900 px-10 text-xl font-bold text-sky-400 hover:bg-neutral-800">Trợ giúp</button>
              </div>
            )}
            {lang === "en" && !feedback && (
              <QuizKeyboard answer={word.term} onKey={(k) => setTyped((t) => t + k)} onBackspace={() => setTyped((t) => t.slice(0, -1))} />
            )}
          </form>
        )}

        {feedback && (
          <FeedbackPanel ok={feedback.ok}>
            <p>
              <Term lang={lang} word={word} /> {word.reading && <span className="ml-2 font-mono text-neutral-400">{word.reading}</span>}
            </p>
            <p className="text-neutral-300">{word.meaning}</p>
            {!feedback.ok && <p className="mt-1 text-sm text-neutral-500">Từ này sẽ quay lại sau vài câu.</p>}
          </FeedbackPanel>
        )}
      </div>
    </QuizShell>
  );
}

/** Ghép từ tương ứng: pick a word on the left, then its meaning on the right. First try right = a correct answer. */
function MatchRound({ lang, shell, words, onPair, onDone }: { lang: "en" | "zh"; shell: ShellProps; words: GameWord[]; onPair: (id: string, ok: boolean) => void; onDone: () => void }) {
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
      if (next.size === words.length) setTimeout(onDone, 700);
    } else {
      if (!missed.has(sel)) setMissed(new Set(missed).add(sel));
      setFlash(id);
      setTimeout(() => setFlash(null), 500);
    }
  };

  return (
    <QuizShell {...shell} title="Ghép từ tương ứng" footer={<QuizButton state={done.size === words.length ? "ok" : "disabled"} onClick={onDone}>Tiếp theo</QuizButton>}>
      <p className="mb-4 text-neutral-400">Chạm một từ bên trái, rồi chạm nghĩa của nó bên phải.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {left.map((w) => (
            <QuizTile key={w.id} state={done.has(w.id) ? "done" : sel === w.id ? "selected" : "idle"} disabled={done.has(w.id)} onClick={() => setSel(w.id)}>
              <Term lang={lang} word={w} />
            </QuizTile>
          ))}
        </div>
        <div className="space-y-3">
          {right.map((w) => (
            <QuizTile key={w.id} state={done.has(w.id) ? "done" : flash === w.id ? "wrong" : "idle"} disabled={done.has(w.id)} onClick={() => pick(w.id)}>
              <span className="text-base">{w.meaning}</span>
            </QuizTile>
          ))}
        </div>
      </div>
    </QuizShell>
  );
}
