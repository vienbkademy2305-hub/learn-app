"use client";
/**
 * One detective story: the story page (stars, stats, witnesses), a witness interview (statements → true/false checks →
 * result → suspicion mark → streak) and the accusation. docs/DETECTIVE_STORIES_PLAN.md.
 */
import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { dateKey, xpOn } from "@/domain/activity";
import { starsFor } from "@/domain/quiz";
import {
  heardClues,
  interviewed,
  maxStars,
  nextStep,
  readingSpeed,
  starsEarned,
  storyStats,
  XP_WITNESS,
  type Story,
  type StoryWitness,
} from "@/domain/story";
import { StreakCelebration } from "@/features/activity/StreakCelebration";
import { useActivity } from "@/features/activity/store";
import { speakChinese } from "@/features/audio/speech";
import { speakEnglish } from "@/features/en/speech";
import { FeedbackPanel, QuizButton, QuizShell, QuizTile, type TileState } from "@/features/quiz/QuizShell";
import { QuizResult } from "@/features/quiz/QuizResult";
import { startStoriesSync } from "./sync";
import { useStories } from "./store";

type View = { kind: "hub" } | { kind: "interview"; witness: string } | { kind: "accuse" };

function Stars({ n, size = "text-lg" }: { n: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${n} trên 3 sao`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "text-amber-300" : "text-neutral-700"}>★</span>
      ))}
    </span>
  );
}

function Highlight({ text, focus }: { text: string; focus?: string[] }) {
  if (!focus?.length) return <>{text}</>;
  const esc = focus.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "i"));
  return (
    <>
      {parts.map((p, i) => (focus.some((f) => f.toLowerCase() === p.toLowerCase()) ? <em key={i} className="font-semibold not-italic text-sky-300 underline decoration-sky-500/50 underline-offset-4">{p}</em> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export function StoryPlayer({ story }: { story: Story }) {
  const [state, actions, hydrated] = useStories();
  useEffect(() => startStoriesSync(), []);
  const [view, setView] = useState<View>({ kind: "hub" });
  const p = state.stories[story.id];
  const total = maxStars(story);
  const earned = hydrated ? starsEarned(p) : 0;
  const stats = storyStats(hydrated ? p : undefined);
  const step = hydrated ? nextStep(story, p) : ({ kind: "interview", witness: story.witnesses[0]!.id } as const);
  const done = interviewed(p);
  const allHeard = hydrated && done.length === story.witnesses.length;
  const nextWitness = step.kind === "interview" ? story.witnesses.find((w) => w.id === step.witness) : undefined;

  const go = () => {
    if (step.kind === "interview") setView({ kind: "interview", witness: step.witness });
    else if (step.kind === "accuse") setView({ kind: "accuse" });
  };

  return (
    <div className="-mx-4 -mt-6 sm:mx-0 sm:mt-0">
      <div className="overflow-hidden bg-black pb-8 text-white sm:rounded-3xl">
        <header className="relative bg-gradient-to-br from-violet-700 via-indigo-700 to-sky-600 px-5 pb-6 pt-8 sm:rounded-t-3xl">
          <Link href={`/${story.lang}/truyen`} className="text-sm font-semibold text-white/80 hover:text-white">← Truyện trinh thám{story.lang === "zh" ? " tiếng Trung" : ""}</Link>
          <div className="mt-3 flex items-center gap-4">
            <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-black/25 text-5xl" aria-hidden>{story.cover}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-widest text-white/70">Vụ án · {story.level}</p>
              <h1 className="text-3xl font-extrabold leading-tight">{story.title_vi}</h1>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-black/60 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-800" role="progressbar" aria-valuenow={earned} aria-valuemax={total} aria-label="Số sao">
                <div className="h-full rounded-full bg-amber-300" style={{ width: `${(earned / total) * 100}%` }} />
              </div>
              <span className="shrink-0 text-sm font-extrabold uppercase tracking-wide text-neutral-400">{earned} / {total} sao</span>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 pt-5">
          <p className="text-lg leading-relaxed text-neutral-300">{story.premise_vi}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl bg-neutral-900 p-4">
              <p className="text-3xl font-extrabold">{stats.wpm ?? "–"}</p>
              <p className="text-neutral-400">{story.lang === "zh" ? "Đọc chữ" : "Đọc từ"} <span className="text-xs">({story.lang === "zh" ? "chữ/phút" : "từ/phút"})</span></p>
            </div>
            <div className="rounded-3xl bg-neutral-900 p-4">
              <p className="text-3xl font-extrabold">{stats.comprehension === null ? "–" : `${stats.comprehension}%`}</p>
              <p className="text-neutral-400">Đọc hiểu văn bản</p>
            </div>
          </div>

          <section>
            <h2 className="text-center text-3xl font-extrabold leading-tight">
              {p?.solved ? "Vụ án đã được giải!" : nextWitness ? <>Phỏng vấn nhân chứng <span className="text-sky-400">{nextWitness.name}</span></> : "Đến lúc buộc tội"}
            </h2>
            <ul className="mt-5 flex flex-wrap justify-center gap-5">
              {story.witnesses.map((w) => {
                const wp = hydrated ? p?.witnesses[w.id] : undefined;
                const isNext = nextWitness?.id === w.id;
                return (
                  <li key={w.id} className="w-24 text-center">
                    <button
                      type="button"
                      onClick={() => setView({ kind: "interview", witness: w.id })}
                      aria-label={`Phỏng vấn ${w.name}`}
                      className={`relative grid size-24 place-items-center rounded-full bg-neutral-900 text-5xl transition active:scale-95 ${isNext ? "ring-4 ring-sky-400" : wp ? "ring-4 ring-amber-700" : "opacity-60 ring-2 ring-neutral-800"}`}
                    >
                      <span aria-hidden>{w.avatar}</span>
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black px-1 text-base leading-none"><Stars n={wp?.stars ?? 0} size="text-base" /></span>
                    </button>
                    <p className="mt-4 text-sm font-bold">{w.name}</p>
                    <p className="text-xs text-neutral-500">{w.role}</p>
                    {wp?.suspicion && (
                      <p className={`mt-1 text-xs font-bold ${wp.suspicion === "suspect" ? "text-red-400" : "text-emerald-400"}`}>{wp.suspicion === "suspect" ? "Nghi ngờ" : "Vô tội"}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {p?.solved && (
            <div className="rounded-3xl bg-emerald-950 p-5">
              <p className="text-2xl font-extrabold text-emerald-400">Hung thủ: {story.witnesses.find((w) => w.id === story.solution.culprit)?.name}</p>
              <p className="mt-2 text-neutral-300">{story.solution.explain_vi}</p>
            </div>
          )}

          <div className="flex gap-3">
            {step.kind !== "done" && (
              <button type="button" onClick={go} className="h-16 flex-1 rounded-full bg-sky-500 text-xl font-extrabold text-white hover:bg-sky-400">
                {done.length === 0 ? "Bắt đầu" : step.kind === "accuse" ? "Buộc tội" : "Tiếp tục"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setView({ kind: "accuse" })}
              disabled={!allHeard}
              title={allHeard ? "Buộc tội" : `Phỏng vấn đủ ${story.witnesses.length} người trước`}
              aria-label="Buộc tội"
              className="grid size-16 shrink-0 place-items-center rounded-full bg-neutral-900 text-2xl font-extrabold text-amber-300 ring-1 ring-neutral-700 enabled:hover:bg-neutral-800 disabled:text-neutral-600"
            >
              ?
            </button>
          </div>
          {!allHeard && hydrated && <p className="text-center text-sm text-neutral-500">Phỏng vấn đủ {story.witnesses.length} người để buộc tội.</p>}
        </div>
      </div>

      {view.kind === "interview" && (
        <Interview
          key={view.witness}
          story={story}
          witness={story.witnesses.find((w) => w.id === view.witness)!}
          onClose={() => setView({ kind: "hub" })}
          finish={(r) => actions.finishInterview(story.id, view.witness, r)}
          mark={(s) => actions.mark(story.id, view.witness, s)}
        />
      )}
      {view.kind === "accuse" && <Accuse story={story} onClose={() => setView({ kind: "hub" })} accuse={(a) => actions.accuse(story, a)} />}
    </div>
  );
}

/* ---------------- interview ---------------- */

type Phase = "intro" | "read" | "check" | "result" | "mark" | "streak";

function Interview({
  story,
  witness,
  onClose,
  finish,
  mark,
}: {
  story: Story;
  witness: StoryWitness;
  onClose: () => void;
  finish: (r: { correct: number; total: number; seconds: number; wpm?: number }) => void;
  mark: (s: "suspect" | "innocent") => void;
}) {
  const [activity] = useActivity();
  const [phase, setPhase] = useState<Phase>("intro");
  const [shown, setShown] = useState(1);
  const [more, setMore] = useState<number | null>(null);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const [round, setRound] = useState(0);
  const startedAt = useRef(Date.now());
  const readStart = useRef(0);
  const readSeconds = useRef(0);
  const doneAt = useRef(0);
  const firstToday = useRef(false);
  const last = witness.segments.length;
  const q = witness.checks[qi];
  const totalQ = witness.checks.length;
  const stored = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (stored.current && clearTimeout(stored.current)), []);

  const text = useMemo(() => witness.segments.map((s) => s.text).join(" "), [witness]);
  const shell = { progress: phase === "check" ? qi / totalQ : phase === "read" ? (shown - 1) / last : 0, badge: right, onExit: onClose };
  const zh = story.lang === "zh";
  const say = (t: string) => (zh ? speakChinese(t, 0.75) : speakEnglish(t, 0.9));

  const begin = () => {
    startedAt.current = Date.now();
    readStart.current = Date.now();
    setShown(1);
    setMore(null);
    setQi(0);
    setPicked(null);
    setRight(0);
    setPhase("read");
    say(witness.segments[0]!.text);
  };

  if (phase === "intro") {
    return (
      <QuizShell progress={0} onExit={onClose} title={witness.name} footer={<QuizButton onClick={begin}>Nghe lời khai</QuizButton>}>
        <div className="flex flex-col items-center pt-6 text-center">
          <span className="grid size-44 place-items-center rounded-[3rem] bg-neutral-900 text-8xl" aria-hidden>{witness.avatar}</span>
          <p className="mt-5 text-2xl font-bold">{witness.name}</p>
          <p lang={zh ? "zh-CN" : "en"} className="text-xl text-neutral-400">{witness.role}{zh && witness.role_pinyin ? <span className="ml-2 text-base text-sky-300">{witness.role_pinyin}</span> : null}</p>
          <p className="mt-6 max-w-sm text-lg text-neutral-300">{story.premise_vi}</p>
        </div>
      </QuizShell>
    );
  }

  if (phase === "read") {
    const atEnd = shown >= last;
    return (
      <QuizShell
        {...shell}
        title={<span className="flex items-center gap-3"><span aria-hidden>{witness.avatar}</span>{witness.name}</span>}
        footer={
          <QuizButton
            onClick={() => {
              if (!atEnd) {
                const nextSeg = witness.segments[shown]!;
                setShown(shown + 1);
                setMore(null);
                say(nextSeg.text);
              } else {
                readSeconds.current = (Date.now() - readStart.current) / 1000;
                setPhase("check");
              }
            }}
          >
            {atEnd ? "Trả lời câu hỏi" : "Tiếp theo"}
          </QuizButton>
        }
      >
        <ol className="space-y-5">
          {witness.segments.slice(0, shown).map((s, i) => {
            const current = i === shown - 1;
            return (
              <li key={i} className={current ? "" : "opacity-60"}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => say(s.text)} aria-label="Nghe lại" className="mt-1 grid size-11 shrink-0 place-items-center rounded-full bg-sky-500 text-xl text-white hover:bg-sky-400">🔊</button>
                  <div>
                    <p lang={zh ? "zh-CN" : "en"} className={zh ? "font-han text-3xl leading-snug" : "text-2xl leading-snug"}><Highlight text={s.text} focus={s.focus} /></p>
                    {zh && s.pinyin && <p className="mt-1 text-lg leading-snug text-sky-300">{s.pinyin}</p>}
                  </div>
                </div>
                {current && (
                  <div className="ml-14 mt-3">
                    <button type="button" onClick={() => setMore(more === i ? null : i)} aria-expanded={more === i} className="flex w-full items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3 text-left text-lg font-bold text-neutral-200 hover:bg-neutral-800">
                      Tìm hiểu thêm <span aria-hidden className="text-amber-300">{more === i ? "▲" : "▼"}</span>
                    </button>
                    {more === i && (
                      <div className="mt-2 space-y-2 rounded-2xl bg-neutral-900 p-4 text-lg text-neutral-300">
                        <p>{s.vi}</p>
                        {s.focus && <p className="text-base text-sky-300">Chú ý: {s.focus.join(" · ")}</p>}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </QuizShell>
    );
  }

  if (phase === "check" && q) {
    const answered = picked !== null;
    const ok = picked === q.answer;
    const tile = (v: boolean): TileState => (!answered ? "idle" : v === q.answer ? "right" : picked === v ? "wrong" : "dim");
    const advance = () => {
      if (qi + 1 >= totalQ) {
        const seconds = (Date.now() - startedAt.current) / 1000;
        doneAt.current = seconds;
        const wpm = readingSpeed(story.lang, text, readSeconds.current) ?? undefined;
        firstToday.current = xpOn(activity, dateKey()) === 0;
        finish({ correct: right, total: totalQ, seconds, wpm });
        setPhase("result");
      } else {
        setQi(qi + 1);
        setPicked(null);
      }
    };
    return (
      <QuizShell
        {...shell}
        title="Bạn biết gì cho đến tận bây giờ?"
        top={
          <p className="text-center text-lg font-bold">
            <span className="text-emerald-400">✓ {right}</span>
            <span className="ml-5 text-red-400">✗ {qi + (answered ? 1 : 0) - right}</span>
            <span className="ml-5 text-neutral-500">{qi + 1}/{totalQ}</span>
          </p>
        }
        footer={<QuizButton state={answered ? (ok ? "ok" : "bad") : "disabled"} onClick={advance}>{qi + 1 >= totalQ ? "Xem kết quả" : "Tiếp theo"}</QuizButton>}
      >
        <div className="space-y-5">
          <div className="rounded-3xl bg-neutral-900 p-5">
            <p className="text-2xl font-bold leading-snug">{q.claim_vi}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <QuizTile outline state={tile(true)} disabled={answered} onClick={() => { setPicked(true); if (q.answer === true) setRight((n) => n + 1); }}>
              <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-emerald-500 text-white">✓</span> Đúng</span>
            </QuizTile>
            <QuizTile outline state={tile(false)} disabled={answered} onClick={() => { setPicked(false); if (q.answer === false) setRight((n) => n + 1); }}>
              <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-red-100 text-red-600">✕</span> Sai</span>
            </QuizTile>
          </div>
          {answered && <FeedbackPanel ok={ok}><p className="text-neutral-200">{q.explain_vi}</p></FeedbackPanel>}
        </div>
      </QuizShell>
    );
  }

  if (phase === "result") {
    return <QuizResult correct={right} total={totalQ} seconds={doneAt.current} xp={XP_WITNESS} onRetry={() => { setRound((r) => r + 1); begin(); }} onSkip={() => setPhase("mark")} key={round} />;
  }

  if (phase === "mark") {
    const choose = (s: "suspect" | "innocent") => {
      mark(s);
      if (firstToday.current) setPhase("streak");
      else onClose();
    };
    return (
      <QuizShell progress={1} onExit={onClose} footer={null}>
        <div className="flex min-h-full flex-col items-center justify-between pt-6 text-center">
          <div>
            <div className="relative mx-auto grid size-52 place-items-center rounded-full bg-amber-950 ring-[6px] ring-amber-300">
              <span className="text-8xl" aria-hidden>{witness.avatar}</span>
              <span className="absolute -bottom-5 rounded-full bg-black px-2"><Stars n={starsFor(right, totalQ)} size="text-4xl" /></span>
            </div>
            <p className="mt-10 text-3xl font-bold">{witness.name}</p>
            <p lang={zh ? "zh-CN" : "en"} className="text-xl text-neutral-400">{witness.role}{zh && witness.role_pinyin ? <span className="ml-2 text-base text-sky-300">{witness.role_pinyin}</span> : null}</p>
          </div>
          <div className="mt-10 w-full space-y-3">
            <h2 className="text-2xl font-extrabold">Bạn đã đặt câu hỏi cho nhân chứng</h2>
            <p className="text-xl text-neutral-400">Chọn trạng thái khả thi</p>
            <button type="button" onClick={() => choose("suspect")} className="h-16 w-full rounded-full bg-red-950 text-xl font-extrabold text-red-400 hover:bg-red-900">Đang bị nghi ngờ</button>
            <button type="button" onClick={() => choose("innocent")} className="h-16 w-full rounded-full bg-emerald-950 text-xl font-extrabold text-emerald-400 hover:bg-emerald-900">Vô tội</button>
          </div>
        </div>
      </QuizShell>
    );
  }

  return <StreakCelebration onContinue={onClose} />;
}

/* ---------------- accusation ---------------- */

function Accuse({ story, onClose, accuse }: { story: Story; onClose: () => void; accuse: (a: { culprit: string; evidence: string[] }) => boolean }) {
  const [state] = useStories();
  const p = state.stories[story.id];
  const clues = heardClues(story, p);
  const [culprit, setCulprit] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<null | { ok: boolean; culpritOk: boolean }>(null);
  const culpritW = story.witnesses.find((w) => w.id === story.solution.culprit)!;

  const toggle = (id: string) => setEvidence((e) => (e.includes(id) ? e.filter((x) => x !== id) : e.length >= 2 ? [...e.slice(1), id] : [...e, id]));
  const submit = () => {
    if (!culprit || evidence.length !== 2) return;
    const ok = accuse({ culprit, evidence });
    setOutcome({ ok, culpritOk: culprit === story.solution.culprit });
  };

  if (outcome?.ok) {
    return (
      <QuizShell progress={1} onExit={onClose} title="🏆 Vụ án được giải!" footer={<QuizButton state="ok" onClick={onClose}>Hoàn thành</QuizButton>}>
        <div className="space-y-4">
          <p className="text-2xl font-bold">Hung thủ là <span className="text-emerald-400">{culpritW.name}</span></p>
          <p className="text-lg text-neutral-300">{story.solution.explain_vi}</p>
          <div className="rounded-3xl bg-neutral-900 p-5">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => (story.lang === "zh" ? speakChinese(story.solution.confession, 0.75) : speakEnglish(story.solution.confession, 0.9))} aria-label="Nghe lời thú tội" className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-500 text-xl text-white">🔊</button>
              <div>
                <p lang={story.lang === "zh" ? "zh-CN" : "en"} className={story.lang === "zh" ? "font-han text-2xl leading-snug" : "text-xl leading-snug"}>“{story.solution.confession}”</p>
                {story.lang === "zh" && story.solution.confession_pinyin && <p className="mt-1 text-base text-sky-300">{story.solution.confession_pinyin}</p>}
              </div>
            </div>
            <p className="mt-3 text-neutral-400">{story.solution.confession_vi}</p>
          </div>
        </div>
      </QuizShell>
    );
  }

  return (
    <QuizShell
      progress={culprit ? (evidence.length === 2 ? 1 : 0.6) : 0.2}
      onExit={onClose}
      title="Ai là hung thủ?"
      footer={
        outcome ? (
          <QuizButton state="bad" onClick={() => setOutcome(null)}>Thử lại</QuizButton>
        ) : (
          <QuizButton state={culprit && evidence.length === 2 ? "idle" : "disabled"} onClick={submit}>Buộc tội</QuizButton>
        )
      }
    >
      <div className="space-y-6">
        <ul className="grid grid-cols-2 gap-3">
          {story.witnesses.map((w) => (
            <li key={w.id}>
              <QuizTile state={culprit === w.id ? "selected" : "idle"} onClick={() => setCulprit(w.id)} disabled={!!outcome} className="flex-col gap-1">
                <span className="text-4xl" aria-hidden>{w.avatar}</span>
                <span className="font-bold">{w.name}</span>
                {p?.witnesses[w.id]?.suspicion && <span className={`text-xs font-bold ${p.witnesses[w.id]!.suspicion === "suspect" ? "text-red-400" : "text-emerald-400"}`}>{p.witnesses[w.id]!.suspicion === "suspect" ? "Đang bị nghi ngờ" : "Vô tội"}</span>}
              </QuizTile>
            </li>
          ))}
        </ul>

        <section>
          <h3 className="text-xl font-extrabold">Chọn 2 manh mối làm bằng chứng</h3>
          <p className="text-neutral-400">Hai điều chứng tỏ lời khai của hung thủ là nói dối. ({evidence.length}/2)</p>
          <ul className="mt-3 space-y-3">
            {clues.map((c) => (
              <li key={c.id}>
                <QuizTile outline state={evidence.includes(c.id) ? "selected" : "idle"} onClick={() => toggle(c.id)} disabled={!!outcome} className="flex-col items-start text-left">
                  <span lang={story.lang === "zh" ? "zh-CN" : "en"} className={story.lang === "zh" ? "font-han text-xl font-semibold" : "text-lg font-semibold"}>{c.text}</span>
                  {story.lang === "zh" && c.pinyin && <span className="text-sm text-sky-300">{c.pinyin}</span>}
                  <span className="text-base text-neutral-400">{c.text_vi}</span>
                </QuizTile>
              </li>
            ))}
          </ul>
        </section>

        {outcome && (
          <FeedbackPanel ok={false}>
            <p className="text-neutral-200">
              {outcome.culpritOk ? "Bạn chọn đúng người, nhưng bằng chứng chưa thuyết phục. Hãy tìm hai lời khai mâu thuẫn với lời của người đó." : "Chưa đúng. Hãy so sánh lời khai của từng người: ai nói điều bị người khác phủ nhận?"}
            </p>
          </FeedbackPanel>
        )}
      </div>
    </QuizShell>
  );
}
