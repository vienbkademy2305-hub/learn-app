"use client";
/**
 * "Nhập môn phát âm" as a set of short missions with stars: a memory aid in Vietnamese, then quick questions in the
 * dark quiz screen (listen & pick, draw the tone, confusable sounds, spelling rules, tone sandhi, memory flip, final
 * challenge). docs/UI_POLISH_PLAN.md. The device's Mandarin voice reads the characters.
 */
import { useEffect, useMemo, useState } from "react";
import { CONFUSABLE_SETS, FINALS, INITIALS, TONE_SANDHI } from "@/content/pronunciation";
import {
  buildBoss,
  buildSandhi,
  buildSoundPick,
  buildSpelling,
  buildToneDraw,
  fromListen,
  maxStars,
  MISSIONS,
  missionStars,
  totalStars,
  type Mission,
  type MissionId,
  type PgQuestion,
} from "@/domain/pinyin-games";
import { buildSoundQuiz, buildToneQuiz, type tonePool } from "@/domain/pronunciation";
import { speakChinese, stopSpeaking, useChineseVoice } from "@/features/audio/speech";
import { QuizResult } from "@/features/quiz/QuizResult";
import { FeedbackPanel, QuizButton, QuizShell, QuizTile, type TileState } from "@/features/quiz/QuizShell";
import { FlipGame } from "@/features/wordgame/MiniGames";
import type { GameWord } from "@/domain/word-game";
import { finishMission, usePinyinProgress } from "./store";

type Pool = ReturnType<typeof tonePool>;

const rand = Math.random;

function ToneContour({ contour }: { contour: number[] }) {
  const w = 160;
  const h = 100;
  const pts = contour.map((v, i) => [10 + (i * (w - 20)) / Math.max(1, contour.length - 1), 10 + ((5 - v) / 4) * (h - 20)] as const);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-32 w-52" role="img" aria-label="Đường thanh điệu">
      {[1, 2, 3, 4, 5].map((v) => (
        <line key={v} x1="10" x2={w - 10} y1={10 + ((5 - v) / 4) * (h - 20)} y2={10 + ((5 - v) / 4) * (h - 20)} stroke="#404040" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[0]![0]} cy={pts[0]![1]} r="6" fill="#fbbf24" />
    </svg>
  );
}

function questionsFor(id: MissionId, pool: Pool): PgQuestion[] {
  const rng = rand;
  const initials = INITIALS.map((g) => g.items);
  const finals = FINALS.map((g) => g.items);
  const sandhi = TONE_SANDHI.flatMap((g) => g.examples.map((e) => ({ ...e, rule: g.rule })));
  switch (id) {
    case "tone-listen":
      return fromListen(buildToneQuiz(pool, rng, 10), "tone");
    case "tone-draw":
      return buildToneDraw(rng, 8);
    case "initials":
      return buildSoundPick(initials, "thanh mẫu", rng, 10);
    case "finals":
      return buildSoundPick(finals, "vận mẫu", rng, 10);
    case "confusable":
      return fromListen(buildSoundQuiz(CONFUSABLE_SETS.map((s) => s.map((x) => ({ hanzi: x.hanzi, pinyin: x.pinyin }))), rng, 10), "conf");
    case "spelling":
      return buildSpelling(rng, 8);
    case "sandhi":
      return buildSandhi(sandhi, rng, 6);
    case "boss":
      return buildBoss(
        [
          fromListen(buildToneQuiz(pool, rng, 6), "t"),
          buildToneDraw(rng, 4),
          buildSoundPick(initials, "thanh mẫu", rng, 4),
          buildSoundPick(finals, "vận mẫu", rng, 3),
          fromListen(buildSoundQuiz(CONFUSABLE_SETS.map((s) => s.map((x) => ({ hanzi: x.hanzi, pinyin: x.pinyin }))), rng, 4), "c"),
          buildSpelling(rng, 4),
          buildSandhi(sandhi, rng, 3),
        ],
        rng,
        15,
      );
    default:
      return [];
  }
}

function MissionQuiz({ mission, pool, onClose }: { mission: Mission; pool: Pool; onClose: () => void }) {
  const [round, setRound] = useState(0);
  const qs = useMemo(() => questionsFor(mission.id, pool), [mission.id, pool, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [start, setStart] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  const q = qs[i];
  const finished = i >= qs.length;

  // save the stars once per run, when the last answer is in
  useEffect(() => {
    if (!finished || qs.length === 0) return;
    setSeconds((Date.now() - start) / 1000);
    // the final challenge needs 70 % to count as passed; everything else keeps its stars as they are
    if (mission.id !== "boss" || right / qs.length >= 0.7) finishMission(mission.id, missionStars(right, qs.length));
  }, [finished, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (slow = false) => q?.hanzi && speakChinese(q.hanzi, slow ? 0.45 : 0.7);
  const answer = (k: number) => {
    if (picked !== null || !q) return;
    setPicked(k);
    if (k === q.answer) setRight((n) => n + 1);
  };
  const next = () => {
    stopSpeaking();
    setI((n) => n + 1);
    setPicked(null);
  };
  const retry = () => {
    setRound((r) => r + 1);
    setI(0);
    setPicked(null);
    setRight(0);
    setStart(Date.now());
  };

  if (qs.length === 0) {
    return (
      <QuizShell progress={0} onExit={onClose} title={mission.title} footer={<QuizButton onClick={onClose}>Quay lại</QuizButton>}>
        <p className="text-neutral-300">Chưa đủ dữ liệu để tạo câu hỏi cho phần này.</p>
      </QuizShell>
    );
  }
  if (finished) {
    const passed = mission.id !== "boss" || right / qs.length >= 0.7;
    return <QuizResult correct={right} total={qs.length} seconds={seconds} xp={10} title={passed ? "Nhiệm vụ hoàn thành!" : "Chưa đạt 70% — thử lại nhé!"} onRetry={retry} onSkip={onClose} />;
  }
  const state = (k: number): TileState => (picked === null ? "idle" : k === q!.answer ? "right" : picked === k ? "wrong" : "dim");
  const ok = picked === q!.answer;
  return (
    <QuizShell
      progress={i / qs.length}
      badge={right}
      title={q!.title}
      top={
        <p className="text-center text-lg font-bold">
          <span className="text-emerald-400">✓ {right}</span>
          <span className="ml-5 text-red-400">✗ {i + (picked !== null ? 1 : 0) - right}</span>
          <span className="ml-5 text-neutral-500">{i + 1}/{qs.length}</span>
        </p>
      }
      footer={
        picked === null ? <QuizButton state="disabled">Tiếp theo</QuizButton> : <QuizButton state={ok ? "ok" : "bad"} onClick={next}>{i + 1 >= qs.length ? "Xem kết quả" : "Tiếp theo"}</QuizButton>
      }
      onExit={onClose}
    >
      <div key={q!.id} className="space-y-5">
        {q!.prompt && <p className="text-lg text-neutral-300">{q!.prompt}</p>}
        {q!.contour && (
          <div className="rounded-3xl bg-neutral-900 p-4">
            <ToneContour contour={q!.contour} />
          </div>
        )}
        {q!.hanzi && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => play()} className="grid h-14 min-w-14 place-items-center rounded-full bg-sky-500/15 px-5 text-lg font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🔊 Nghe</button>
            <button type="button" onClick={() => play(true)} className="grid h-14 min-w-14 place-items-center rounded-full bg-sky-500/15 px-5 text-lg font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🐢 Chậm</button>
          </div>
        )}
        <div className={`grid gap-3 ${q!.options.length <= 4 && q!.options.every((o) => o.text.length <= 6) ? "grid-cols-2" : "grid-cols-1"}`}>
          {q!.options.map((o, k) => (
            <QuizTile key={k} outline state={state(k)} disabled={picked !== null} onClick={() => answer(k)}>
              <span className="flex flex-col items-center leading-tight">
                <span className="text-2xl font-bold">{o.text}</span>
                {o.sub && <span className="text-sm opacity-70">{o.sub}</span>}
              </span>
            </QuizTile>
          ))}
        </div>
        {picked !== null && (
          <FeedbackPanel ok={ok}>
            <p className="text-neutral-200">{q!.explain}</p>
          </FeedbackPanel>
        )}
      </div>
    </QuizShell>
  );
}

/** Memory aid first, then the questions. */
function MissionScreen({ mission, pool, onClose }: { mission: Mission; pool: Pool; onClose: () => void }) {
  const voice = useChineseVoice();
  const [phase, setPhase] = useState<"tip" | "play">("tip");
  const needsVoice = mission.listen && voice !== "available";
  if (phase === "play") {
    if (mission.id === "flip") return <FlipMission onClose={onClose} />;
    return <MissionQuiz mission={mission} pool={pool} onClose={onClose} />;
  }
  return (
    <QuizShell
      progress={0}
      onExit={onClose}
      title={`${mission.icon} ${mission.title}`}
      footer={<QuizButton state={needsVoice && voice === "unavailable" ? "disabled" : "idle"} onClick={() => setPhase("play")}>{needsVoice && voice === "loading" ? "Đang tải giọng đọc…" : "Bắt đầu"}</QuizButton>}
    >
      <p className="mb-3 text-sm font-extrabold uppercase tracking-wide text-violet-400">Mẹo nhớ</p>
      <ul className="space-y-3">
        {mission.tip.map((t, i) => (
          <li key={i} className="rounded-2xl bg-neutral-900 p-4 text-lg leading-snug text-neutral-100">{t}</li>
        ))}
      </ul>
      {mission.listen && voice === "unavailable" && (
        <p className="mt-4 rounded-2xl bg-amber-950 p-3 text-amber-300">Phần này cần giọng đọc tiếng Trung của thiết bị. Hãy mở bằng Chrome hoặc Safari có giọng tiếng Trung, hoặc làm các phần không cần nghe.</p>
      )}
    </QuizShell>
  );
}

function FlipMission({ onClose }: { onClose: () => void }) {
  const words = useMemo<GameWord[]>(
    () => INITIALS.flatMap((g) => g.items).map((it) => ({ id: it.sound, term: it.hanzi, reading: it.pinyin, meaning: `thanh mẫu “${it.sound}”`, definitionEn: null, lesson: 0 })),
    [],
  );
  return (
    <FlipGame
      lang="zh"
      words={words}
      onExit={onClose}
      onDone={(moves) => finishMission("flip", moves <= 8 ? 3 : moves <= 12 ? 2 : 1)}
    />
  );
}

export function PinyinPlay({ pool }: { pool: Pool }) {
  const [progress, hydrated] = usePinyinProgress();
  const [open, setOpen] = useState<Mission | null>(null);
  const earned = hydrated ? totalStars(progress) : 0;
  const total = maxStars();
  const next = MISSIONS.find((m) => !(progress.stars[m.id] ?? 0)) ?? null;

  return (
    <section id="choi" className="scroll-mt-20 space-y-4 rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-sky-600 p-5 text-white shadow-md">
      <div>
        <h2 className="text-2xl font-extrabold">🎮 Học phát âm bằng chơi game</h2>
        <p className="mt-1 text-white/80">9 màn ngắn, mỗi màn có mẹo nhớ bằng tiếng Việt. Làm từng màn, mỗi lần 2–3 phút, để nhớ lâu hơn là đọc tài liệu.</p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-black/30 p-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/40" role="progressbar" aria-valuenow={earned} aria-valuemax={total} aria-label="Số sao">
          <div className="h-full rounded-full bg-amber-300" style={{ width: `${(earned / total) * 100}%` }} />
        </div>
        <span className="text-sm font-extrabold">{earned}/{total} ★</span>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MISSIONS.map((m) => {
          const s = hydrated ? (progress.stars[m.id] ?? 0) : 0;
          const isNext = next?.id === m.id;
          return (
            <li key={m.id} className="min-w-0">
              <button
                type="button"
                onClick={() => setOpen(m)}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[.98] ${isNext ? "bg-white text-stone-900 shadow-lg" : "bg-black/30 text-white hover:bg-black/40"}`}
              >
                <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-2xl text-2xl ${isNext ? "bg-violet-100" : "bg-white/10"}`}>{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{m.title}{isNext && <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 align-middle text-[10px] font-bold text-white">Làm tiếp</span>}</span>
                  <span className={`block truncate text-sm ${isNext ? "text-stone-500" : "text-white/70"}`}>{m.hint}</span>
                </span>
                <span className="shrink-0 text-lg tracking-tight" aria-label={`${s} trên 3 sao`}>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={k <= s ? "text-amber-400" : isNext ? "text-stone-300" : "text-white/25"}>★</span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <MissionScreen key={open.id} mission={open} pool={pool} onClose={() => setOpen(null)} />}
    </section>
  );
}
