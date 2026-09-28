"use client";
import { useEffect, useState } from "react";
import { buildListening, type ExSentence, type ExWord, type ListeningQuestion } from "@/domain/exercises";
import { recordListen, recordListenAnswer } from "@/domain/progress";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { useProgress } from "@/features/progress/store";
import { assetUrl } from "@/lib/storage-url";
import { Choices, ExerciseRunner, Feedback } from "./ExerciseRunner";

const PROMPTS: Record<ListeningQuestion["kind"], string> = {
  "listen-meaning": "Nghe và chọn nghĩa đúng",
  "listen-sentence": "Nghe và chọn câu đúng",
  "listen-fill": "Nghe và chọn từ còn thiếu",
};

function Reveal({ sentence }: { sentence: ExSentence }) {
  return (
    <div className="mt-1 space-y-0.5">
      <p lang="zh-CN" className="font-han text-lg text-stone-900">{sentence.simplified}</p>
      {sentence.pinyin && <p className="text-sm text-brand-700">{sentence.pinyin}</p>}
      {sentence.vi && <p className="text-sm">{sentence.vi}</p>}
    </div>
  );
}

function ListeningQuestionView({ q, onResult }: { q: ListeningQuestion; onResult: (c: boolean) => void }) {
  const [result, setResult] = useState<boolean | null>(null);
  const [, update] = useProgress();

  // The learner already clicked (Bắt đầu / Câu tiếp), so autoplay is allowed.
  useEffect(() => {
    const key = q.sentence.audio.normal ?? q.sentence.audio.slow;
    if (!key) return;
    const el = new Audio(assetUrl(key));
    el.onended = () => update((s) => recordListen(s, q.sentence.key));
    el.play().catch(() => {});
    return () => {
      el.onended = null;
      el.pause();
    };
  }, [q, update]);

  const answer = (c: boolean) => {
    setResult(c);
    update((s) => recordListenAnswer(s, q.sentence.key, c));
    onResult(c);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-stone-900">{PROMPTS[q.kind]}</p>
        <AudioButtons audio={q.sentence.audio} durations={q.sentence.audioMs} sentenceKey={q.sentence.key} />
      </div>

      {q.kind === "listen-fill" && (
        <p lang="zh-CN" className="font-han text-2xl leading-relaxed text-stone-900">
          {q.sentence.tokens.map((t, i) =>
            i === q.blank ? (
              <span key={i} className="mx-1 inline-block min-w-12 border-b-2 border-brand-500 text-center text-brand-700">
                {result === null ? " " : t.text}
              </span>
            ) : (
              <span key={i}>{t.text}</span>
            ),
          )}
        </p>
      )}

      <Choices choices={q.choices} onResult={answer} hanzi={q.kind !== "listen-meaning"} />

      {result !== null && (
        <Feedback correct={result}>
          <Reveal sentence={q.sentence} />
        </Feedback>
      )}
    </div>
  );
}

export function ListeningExercise({ lessonSlug, words, sentences }: { lessonSlug: string; words: ExWord[]; sentences: ExSentence[] }) {
  return (
    <ExerciseRunner<ListeningQuestion>
      lessonSlug={lessonSlug}
      type="listening"
      build={() => buildListening(sentences, words, Math.random)}
      renderQuestion={(q, onResult) => <ListeningQuestionView q={q} onResult={onResult} />}
    />
  );
}
