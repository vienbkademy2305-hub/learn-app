"use client";
import { useState } from "react";
import { checkPinyin, type ExWord } from "@/domain/exercises";
import { buildVocabRecall, RECALL_MODES, type RecallMode, type RecallQuestion } from "@/domain/practice";
import { ListenPrompt } from "@/features/audio/ListenPrompt";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { useChineseVoice } from "@/features/audio/speech";
import { Choices, ExerciseRunner, Feedback } from "@/features/exercises/ExerciseRunner";

const PROMPT: Record<RecallQuestion["kind"], string> = {
  "hanzi-meaning": "Từ này nghĩa là gì?",
  "meaning-hanzi": "Chọn chữ Hán đúng với nghĩa:",
  "pinyin-hanzi": "Chọn chữ Hán đúng với pinyin:",
  "listen-hanzi": "Nghe và chọn từ đúng:",
  "listen-meaning": "Nghe và chọn nghĩa đúng:",
  "meaning-type": "Viết từ tiếng Trung có nghĩa:",
};

const MODE_LABEL: Record<RecallMode, string> = {
  mixed: "Trộn tất cả",
  listening: "🎧 Nghe",
  "vi-zh": "Việt → Trung",
  "zh-vi": "Trung → Việt",
};
const LENGTHS = [10, 20, 30] as const;

function Answer({ word }: { word: ExWord }) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span lang="zh-CN" className="font-han text-lg text-stone-900">{word.simplified}</span>
      <span className="text-brand-700">{word.pinyin}</span>— {word.meaning}
      <SpeakButtons text={word.simplified} compact />
    </p>
  );
}

function TypeView({ word, onResult }: { word: ExWord; onResult: (c: boolean) => void }) {
  const [value, setValue] = useState("");
  const [grade, setGrade] = useState<"correct" | "tone" | "wrong" | null>(null);
  const check = () => {
    // Typing the characters themselves (Chinese keyboard) also counts.
    const g = value.trim() === word.simplified ? "correct" : checkPinyin(value, word.slug.split("-")[0]!);
    setGrade(g);
    onResult(g === "correct");
  };
  return (
    <div className="space-y-3">
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
          aria-label="Pinyin hoặc chữ Hán"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          placeholder="Gõ pinyin (ni3 hao3 / nǐ hǎo) hoặc chữ Hán"
          className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-lg ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-stone-50"
        />
        {grade === null && (
          <button type="submit" disabled={!value.trim()} className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-700 disabled:opacity-40">
            Kiểm tra
          </button>
        )}
      </form>
      <p className="text-xs text-stone-500">Gõ số thanh sau mỗi âm tiết (1–4, thanh nhẹ để trống hoặc 5). Chữ ü gõ là v.</p>
      {grade !== null && (
        <Feedback correct={grade === "correct"}>
          {grade === "tone" && <p>Đúng chữ nhưng sai thanh điệu.</p>}
          <Answer word={word} />
        </Feedback>
      )}
    </div>
  );
}

function RecallView({ q, onResult }: { q: RecallQuestion; onResult: (c: boolean) => void }) {
  const [correct, setCorrect] = useState<boolean | null>(null);
  const listening = q.kind === "listen-hanzi" || q.kind === "listen-meaning";
  return (
    <div className="space-y-4">
      <p className="font-semibold text-stone-900">{PROMPT[q.kind]}</p>
      <div className="flex flex-wrap items-center gap-3">
        {q.kind === "hanzi-meaning" && (
          <>
            <span lang="zh-CN" className="font-han text-6xl text-stone-900">{q.word.simplified}</span>
            <SpeakButtons text={q.word.simplified} compact />
          </>
        )}
        {(q.kind === "meaning-hanzi" || q.kind === "meaning-type") && <span className="text-2xl font-medium text-stone-800">“{q.word.meaning}”</span>}
        {q.kind === "pinyin-hanzi" && (
          <>
            <span className="text-3xl font-medium text-brand-700">{q.word.pinyin}</span>
            <SpeakButtons text={q.word.simplified} compact label={q.word.pinyin} />
          </>
        )}
        {listening && <ListenPrompt text={q.word.simplified} />}
      </div>
      {q.kind === "meaning-type" ? (
        <TypeView word={q.word} onResult={onResult} />
      ) : (
        <>
          <Choices
            choices={q.choices}
            hanzi={q.kind !== "hanzi-meaning" && q.kind !== "listen-meaning"}
            onResult={(ok) => {
              setCorrect(ok);
              onResult(ok);
            }}
          />
          {correct !== null && (
            <Feedback correct={correct}>
              <Answer word={q.word} />
            </Feedback>
          )}
        </>
      )}
    </div>
  );
}

/** Unscored recall rounds: the point is repetition, so nothing is saved. */
export function VocabRecall({ lessonSlug, words }: { lessonSlug: string; words: ExWord[] }) {
  const voice = useChineseVoice();
  const [mode, setMode] = useState<RecallMode>("mixed");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(20);
  const canListen = voice === "available";

  const seg = (active: boolean) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-700">Dạng câu hỏi</p>
          <div className="flex w-fit flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
            {(Object.keys(RECALL_MODES) as RecallMode[]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} disabled={m === "listening" && !canListen} className={`${seg(mode === m)} disabled:opacity-40`}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-700">Số câu mỗi lượt</p>
          <div className="flex w-fit gap-1 rounded-xl bg-stone-100 p-1">
            {LENGTHS.map((n) => (
              <button key={n} type="button" onClick={() => setLength(n)} aria-pressed={length === n} className={seg(length === n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <p className="w-full text-xs text-stone-500">
          Bài có {words.length} từ — lượt dài hơn sẽ lặp lại từ để nhớ lâu hơn.
          {voice === "unavailable" && " Máy chưa có giọng đọc tiếng Trung nên tạm bỏ câu nghe (cài giọng “Chinese (China)” trong cài đặt ngôn ngữ để bật)."}
        </p>
      </div>

      <ExerciseRunner<RecallQuestion>
        key={`${mode}-${length}`}
        lessonSlug={lessonSlug}
        build={() => buildVocabRecall(words, Math.random, length, RECALL_MODES[mode], canListen)}
        renderQuestion={(q, onResult) => <RecallView q={q} onResult={onResult} />}
        emptyMessage="Bài học này cần ít nhất 4 từ có nghĩa để luyện nhớ từ."
        back={{ href: `/zh/lesson/${lessonSlug}/practice/flashcards`, label: "Ôn bằng flashcard" }}
      />
    </div>
  );
}
