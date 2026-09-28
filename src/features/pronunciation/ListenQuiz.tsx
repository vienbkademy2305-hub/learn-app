"use client";
import { useState } from "react";
import { CONFUSABLE_SETS } from "@/content/pronunciation";
import { buildSoundQuiz, buildToneQuiz, type ListenQuestion, type tonePool } from "@/domain/pronunciation";
import { ListenPrompt } from "@/features/audio/ListenPrompt";
import { useChineseVoice } from "@/features/audio/speech";
import { Choices, ExerciseRunner, Feedback } from "@/features/exercises/ExerciseRunner";

function QuestionView({ q, onResult }: { q: ListenQuestion; onResult: (c: boolean) => void }) {
  const [correct, setCorrect] = useState<boolean | null>(null);
  return (
    <div className="space-y-4">
      <p className="font-semibold text-stone-900">{q.kind === "tone" ? "Nghe và chọn thanh điệu đúng:" : "Nghe và chọn pinyin đúng:"}</p>
      <ListenPrompt text={q.hanzi} rate={0.7} slowRate={0.45} />
      <Choices
        choices={q.choices}
        onResult={(ok) => {
          setCorrect(ok);
          onResult(ok);
        }}
      />
      {correct !== null && (
        <Feedback correct={correct}>
          Đáp án: <strong className="text-lg text-brand-700">{q.answer}</strong> — chữ <span lang="zh-CN" className="font-han text-lg text-stone-900">{q.hanzi}</span>
        </Feedback>
      )}
    </div>
  );
}

/** Tone and confusable-sound listening drills of lesson 0 (unscored). */
export function ListenQuiz({ pool, next }: { pool: ReturnType<typeof tonePool>; next: { href: string; label: string } }) {
  const voice = useChineseVoice();
  const [mode, setMode] = useState<"tone" | "sound">("tone");
  if (voice === "loading") return null;
  if (voice === "unavailable") return <p className="rounded-2xl bg-white p-6 text-center text-stone-500">Cần giọng đọc tiếng Trung trên máy để luyện nghe (xem hướng dẫn cài ở đầu trang).</p>;

  const seg = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`;
  return (
    <div className="space-y-3">
      <div className="flex w-fit gap-1 rounded-xl bg-stone-100 p-1">
        <button type="button" onClick={() => setMode("tone")} aria-pressed={mode === "tone"} className={seg(mode === "tone")}>
          Nghe thanh điệu
        </button>
        <button type="button" onClick={() => setMode("sound")} aria-pressed={mode === "sound"} className={seg(mode === "sound")}>
          Phân biệt âm dễ nhầm
        </button>
      </div>
      <ExerciseRunner<ListenQuestion>
        key={mode}
        lessonSlug=""
        build={() => (mode === "tone" ? buildToneQuiz(pool, Math.random) : buildSoundQuiz(CONFUSABLE_SETS, Math.random))}
        renderQuestion={(q, onResult) => <QuestionView q={q} onResult={onResult} />}
        back={next}
      />
    </div>
  );
}
