"use client";
import { useEffect, useState } from "react";
import { buildListening, type ExSentence, type ExWord, type ListeningQuestion } from "@/domain/exercises";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { assetUrl } from "@/lib/storage-url";
import { Choices, ExerciseRunner, Feedback } from "./ExerciseRunner";

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

  // The learner already clicked (Bắt đầu / Câu tiếp), so autoplay is allowed.
  useEffect(() => {
    const key = q.sentence.audio.normal ?? q.sentence.audio.slow;
    if (!key) return;
    const el = new Audio(assetUrl(key));
    el.play().catch(() => {});
    return () => el.pause();
  }, [q]);

  const answer = (c: boolean) => {
    setResult(c);
    onResult(c);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-stone-900">{q.kind === "listen-meaning" ? "Nghe và chọn nghĩa đúng" : "Nghe và chọn từ còn thiếu"}</p>
        <AudioButtons audio={q.sentence.audio} />
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

      <Choices choices={q.choices} onResult={answer} hanzi={q.kind === "listen-fill"} />

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
