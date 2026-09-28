"use client";
import type HanziWriter from "hanzi-writer";
import { useEffect, useRef, useState } from "react";
import { buildCharacterWriting, type CharacterQuestion, type ExWord } from "@/domain/exercises";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { strokeLoader, WRITER_COLORS, WritingGrid } from "@/features/writing/shared";
import { ExerciseRunner, Feedback } from "./ExerciseRunner";

/** Mistakes allowed for the character to count as correct. */
const PASS_MISTAKES = 3;
const SIZE = 260;

function WriteCharView({ q, onResult }: { q: CharacterQuestion; onResult: (c: boolean) => void }) {
  const target = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const [stroke, setStroke] = useState(0);
  const [total, setTotal] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const finish = useRef(onResult);
  useEffect(() => {
    finish.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let cancelled = false;
    el.innerHTML = "";
    import("hanzi-writer").then(({ default: HW }) => {
      if (cancelled) return;
      const w = HW.create(el, q.hanzi, {
        width: SIZE,
        height: SIZE,
        padding: 8,
        showOutline: false,
        showCharacter: false,
        ...WRITER_COLORS,
        charDataLoader: strokeLoader(q.stroke),
        onLoadCharDataSuccess: (data) => !cancelled && setTotal(data.strokes.length),
        onLoadCharDataError: () => !cancelled && setFailed(true),
      });
      writer.current = w;
      w.quiz({
        showHintAfterMisses: 3,
        leniency: 1.2,
        onCorrectStroke: (d) => setStroke(d.strokeNum + 1),
        onMistake: (d) => setMistakes(d.totalMistakes),
        onComplete: ({ totalMistakes }) => {
          const ok = totalMistakes <= PASS_MISTAKES;
          setMistakes(totalMistakes);
          setResult(ok);
          finish.current(ok);
        },
      });
    });
    return () => {
      cancelled = true;
      writer.current?.cancelQuiz();
    };
  }, [q]);

  const giveUp = () => {
    const w = writer.current;
    if (!w || result !== null) return;
    w.cancelQuiz();
    w.showOutline();
    w.animateCharacter();
    setResult(false);
    onResult(false);
  };

  const context = [...q.word.simplified].map((c) => (c === q.hanzi ? "□" : c)).join("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-stone-900">Viết chữ Hán có âm:</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-medium text-brand-700">
            {q.pinyin ?? "?"} <SpeakButtons text={q.hanzi} compact label={q.pinyin ?? "chữ này"} />
          </p>
          <p className="mt-1 text-sm text-stone-600">
            trong từ <span lang="zh-CN" className="font-han text-lg text-stone-900">{context}</span> ({q.word.pinyin}){q.word.meaning ? ` — ${q.word.meaning}` : ""}
          </p>
        </div>
        <p className="text-sm text-stone-500">{result === null ? (total ? `Nét ${Math.min(stroke + 1, total)}/${total}` : "Đang tải…") : `Sai ${mistakes} lần`}</p>
      </div>

      {failed ? (
        <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Không tải được dữ liệu nét chữ.</p>
      ) : (
        <div className="mx-auto relative rounded-lg bg-white" style={{ width: SIZE, height: SIZE, touchAction: "none" }}>
          <WritingGrid />
          <div ref={target} className="relative" role="img" aria-label="Khung viết bài tập" data-stroke={q.stroke} />
        </div>
      )}

      {result === null ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">Viết lần lượt từng nét. Sai 3 lần ở một nét sẽ có gợi ý. Đạt nếu sai không quá {PASS_MISTAKES} lần.</p>
          <button type="button" onClick={giveUp} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
            Xem đáp án
          </button>
        </div>
      ) : (
        <Feedback correct={result}>
          <p>
            Chữ đúng: <span lang="zh-CN" className="font-han text-2xl text-stone-900">{q.hanzi}</span>
            {result && mistakes > 0 && <span className="ml-2 text-stone-500">(sai {mistakes} lần — vẫn đạt)</span>}
          </p>
        </Feedback>
      )}
    </div>
  );
}

export function CharacterExercise({ lessonSlug, words }: { lessonSlug: string; words: ExWord[] }) {
  return (
    <ExerciseRunner<CharacterQuestion>
      lessonSlug={lessonSlug}
      type="characters"
      build={() => buildCharacterWriting(words, Math.random)}
      renderQuestion={(q, onResult) => <WriteCharView q={q} onResult={onResult} />}
    />
  );
}
