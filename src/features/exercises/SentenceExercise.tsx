"use client";
import { useState } from "react";
import { buildSentenceWriting, checkPinyin, checkReorder, type ExSentence, type ExWord, type SentenceQuestion } from "@/domain/exercises";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { ExerciseRunner, Feedback } from "./ExerciseRunner";

function ReorderView({ q, onResult }: { q: Extract<SentenceQuestion, { kind: "reorder" }>; onResult: (c: boolean) => void }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const pieceById = new Map(q.pieces.map((p) => [p.id, p]));
  const done = result !== null;

  const check = () => {
    const ok = checkReorder(chosen.map((id) => pieceById.get(id)!.text), q.answer);
    setResult(ok);
    onResult(ok);
  };

  const chip = "font-han rounded-xl px-3 py-2 text-xl ring-1 ring-inset transition-colors";
  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-stone-900">Sắp xếp các từ thành câu có nghĩa:</p>
        <p className="mt-1 text-lg text-stone-700">“{q.sentence.vi}”</p>
      </div>

      <div className={`flex min-h-16 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-3 ${done ? (result ? "border-jade-600 bg-jade-50" : "border-brand-300 bg-brand-50") : "border-stone-300"}`} aria-label="Câu của bạn">
        {chosen.length === 0 && <span className="text-sm text-stone-400">Bấm vào các từ bên dưới theo đúng thứ tự</span>}
        {chosen.map((id) => (
          <button
            key={id}
            type="button"
            lang="zh-CN"
            disabled={done}
            onClick={() => setChosen((c) => c.filter((x) => x !== id))}
            className={`${chip} bg-white text-stone-900 ring-stone-300`}
            aria-label={`Bỏ ${pieceById.get(id)!.text}`}
          >
            {pieceById.get(id)!.text}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Các từ">
        {q.pieces.map((p) =>
          chosen.includes(p.id) ? (
            <span key={p.id} className={`${chip} invisible`} aria-hidden="true">
              {p.text}
            </span>
          ) : (
            <button key={p.id} type="button" lang="zh-CN" disabled={done} onClick={() => setChosen((c) => [...c, p.id])} className={`${chip} bg-stone-50 text-stone-900 ring-stone-300 hover:ring-brand-300`}>
              {p.text}
            </button>
          ),
        )}
      </div>

      {!done && (
        <div className="flex justify-end">
          <button type="button" onClick={check} disabled={chosen.length !== q.pieces.length} className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-700 disabled:opacity-40">
            Kiểm tra
          </button>
        </div>
      )}

      {done && (
        <Feedback correct={result}>
          <p lang="zh-CN" className="font-han text-lg text-stone-900">{q.sentence.simplified}</p>
          {q.sentence.pinyin && <p className="text-sm text-brand-700">{q.sentence.pinyin}</p>}
          <div className="mt-2">
            <AudioButtons audio={q.sentence.audio} compact />
          </div>
          {!result && <p className="mt-1 text-xs text-stone-500">Đáp án theo câu mẫu của bài.</p>}
        </Feedback>
      )}
    </div>
  );
}

function PinyinView({ q, onResult }: { q: Extract<SentenceQuestion, { kind: "pinyin" }>; onResult: (c: boolean) => void }) {
  const [value, setValue] = useState("");
  const [grade, setGrade] = useState<"correct" | "tone" | "wrong" | null>(null);
  const pinyinKey = q.word.slug.split("-")[0]!;

  const check = () => {
    const g = checkPinyin(value, pinyinKey);
    setGrade(g);
    onResult(g === "correct");
  };

  return (
    <div className="space-y-4">
      <p className="font-semibold text-stone-900">Viết pinyin cho từ này:</p>
      <div className="flex flex-wrap items-center gap-4">
        <span lang="zh-CN" className="font-han text-6xl text-stone-900">{q.word.simplified}</span>
        {q.word.meaning && <span className="text-stone-600">{q.word.meaning}</span>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (grade === null && value.trim()) check();
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={grade !== null}
          aria-label="Pinyin"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="VD: nǐ hǎo hoặc ni3 hao3"
          className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-lg ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-stone-50"
        />
        {grade === null && (
          <button type="submit" disabled={!value.trim()} className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-700 disabled:opacity-40">
            Kiểm tra
          </button>
        )}
      </form>
      <p className="text-xs text-stone-500">Gõ dấu thanh hoặc số thanh sau mỗi âm tiết (1–4, thanh nhẹ để trống hoặc 5). Chữ ü gõ là v.</p>
      {grade !== null && (
        <Feedback correct={grade === "correct"}>
          {grade === "tone" && <p>Đúng chữ nhưng sai thanh điệu.</p>}
          <p className="flex flex-wrap items-center gap-2">
            Đáp án: <strong className="text-lg text-brand-700">{q.word.pinyin}</strong>
            <SpeakButtons text={q.word.simplified} compact />
          </p>
        </Feedback>
      )}
    </div>
  );
}

export function SentenceExercise({ lessonSlug, words, sentences }: { lessonSlug: string; words: ExWord[]; sentences: ExSentence[] }) {
  return (
    <ExerciseRunner<SentenceQuestion>
      lessonSlug={lessonSlug}
      type="sentences"
      build={() => buildSentenceWriting(sentences, words, Math.random)}
      renderQuestion={(q, onResult) => (q.kind === "reorder" ? <ReorderView q={q} onResult={onResult} /> : <PinyinView q={q} onResult={onResult} />)}
    />
  );
}
