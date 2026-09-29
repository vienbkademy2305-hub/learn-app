"use client";
import { useState } from "react";
import type { GrammarData } from "@/content/types";
import { buildGrammarQuiz, type GrammarQuizQuestion } from "@/domain/grammar";
import { Choices, ExerciseRunner, Feedback } from "@/features/exercises/ExerciseRunner";

function QuizView({ q, onResult }: { q: GrammarQuizQuestion; onResult: (c: boolean) => void }) {
  const [correct, setCorrect] = useState<boolean | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-stone-900">Câu nào đúng ngữ pháp?</p>
        <p className="text-sm text-stone-500">{q.pointTitle}</p>
      </div>
      <Choices
        choices={q.choices}
        hanzi
        onResult={(ok) => {
          setCorrect(ok);
          onResult(ok);
        }}
      />
      {correct !== null && <Feedback correct={correct}>{q.why}</Feedback>}
    </div>
  );
}

/** Unscored check of the lesson's grammar, built from the "common mistakes" pairs. */
export function GrammarQuiz({ lessonSlug, points }: { lessonSlug: string; points: Array<Pick<GrammarData, "title" | "mistakes">> }) {
  return (
    <ExerciseRunner<GrammarQuizQuestion>
      lessonSlug={lessonSlug}
      build={() => buildGrammarQuiz(points, Math.random)}
      renderQuestion={(q, onResult) => <QuizView q={q} onResult={onResult} />}
      emptyMessage="Bài này chưa có câu luyện ngữ pháp."
      back={{ href: `/zh/lesson/${lessonSlug}/examples`, label: "Xem câu ví dụ" }}
    />
  );
}
