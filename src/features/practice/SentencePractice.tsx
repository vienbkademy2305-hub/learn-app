"use client";
import { useMemo, useState } from "react";
import { checkOwnSentence, type SentenceCheck } from "@/domain/practice";
import { noteKey } from "@/domain/progress";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { useProgress } from "@/features/progress/store";
import { CheckItem, useNote, WritingBox } from "./WritingBox";

export interface SentenceWord {
  slug: string;
  simplified: string;
  pinyin: string;
  meaning: string | null;
  models: Array<{ simplified: string; pinyin: string | null; vi: string | null; audio: { normal?: string; slow?: string } }>;
}

function SentenceEditor({ lessonSlug, word, words, known }: { lessonSlug: string; word: SentenceWord; words: SentenceWord[]; known: ReadonlySet<string> }) {
  const [text, setText, { savedAt, flush }] = useNote(noteKey.sentence(lessonSlug, word.slug));
  const [check, setCheck] = useState<SentenceCheck | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-stone-900">Đặt một câu có nghĩa với từ:</p>
        <p className="mt-1 flex flex-wrap items-center gap-3">
          <span lang="zh-CN" className="font-han text-4xl text-stone-900">{word.simplified}</span>
          <span className="text-lg text-brand-700">{word.pinyin}</span>
          <SpeakButtons text={word.simplified} compact />
          {word.meaning && <span className="text-stone-600">— {word.meaning}</span>}
        </p>
      </div>

      <WritingBox
        value={text}
        onChange={(v) => {
          setText(v);
          setCheck(null);
        }}
        onBlur={flush}
        words={words}
        label={`Câu của bạn với từ ${word.simplified}`}
        placeholder={`VD: 我…${word.simplified}…。`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-stone-400">{savedAt ? `Đã lưu ${new Date(savedAt).toLocaleString("vi-VN")}` : ""}</span>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            flush();
            setCheck(checkOwnSentence(text, word.simplified, known));
          }}
          className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-700 disabled:opacity-40"
        >
          Tự kiểm tra
        </button>
      </div>

      {check && (
        <div className="space-y-3 rounded-xl bg-stone-50 p-4 text-sm">
          <ul className="space-y-1">
            <CheckItem ok={check.usesTarget}>Có dùng từ “{word.simplified}”</CheckItem>
            <CheckItem ok={check.hanCount >= 3}>Câu có ít nhất 3 chữ Hán ({check.hanCount} chữ)</CheckItem>
            <CheckItem ok={check.endsWithPunctuation} warn>Kết thúc bằng dấu câu (。？！)</CheckItem>
            <CheckItem ok={check.unknown.length === 0} warn>
              {check.unknown.length === 0 ? (
                "Chỉ dùng chữ đã học"
              ) : (
                <>
                  Có chữ chưa học tới bài này: <span lang="zh-CN" className="font-han text-base">{check.unknown.join(" ")}</span> — kiểm tra lại xem có gõ nhầm không.
                </>
              )}
            </CheckItem>
          </ul>
          <p className="text-stone-600">Máy chưa chấm được nghĩa của câu. Hãy đọc to câu của bạn và so với câu mẫu bên dưới: trật tự thường là <strong>Chủ ngữ + (thời gian/nơi chốn) + Động từ + Tân ngữ</strong>.</p>
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Nghe câu của bạn:</span>
            <SpeakButtons text={text} compact label="câu của bạn" />
          </div>
          {word.models.length > 0 && (
            <div>
              <p className="mb-1.5 font-medium text-stone-700">Câu mẫu có từ này:</p>
              <ul className="space-y-2">
                {word.models.map((m) => (
                  <li key={m.simplified} className="rounded-lg bg-white p-3 ring-1 ring-stone-200">
                    <p lang="zh-CN" className="font-han text-lg text-stone-900">{m.simplified}</p>
                    {m.pinyin && <p className="text-brand-700">{m.pinyin}</p>}
                    {m.vi && <p className="text-stone-600">{m.vi}</p>}
                    <div className="mt-1.5">
                      <AudioButtons audio={m.audio} compact />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SentencePractice({ lessonSlug, words, knownChars }: { lessonSlug: string; words: SentenceWord[]; knownChars: string[] }) {
  const [state, , hydrated] = useProgress();
  const known = useMemo(() => new Set(knownChars), [knownChars]);
  const [index, setIndex] = useState(0);
  const current = words[index];
  if (!current) return <p className="rounded-2xl bg-white p-6 text-center text-stone-500">Bài này chưa có từ vựng.</p>;

  const written = (slug: string) => hydrated && Boolean(state.notes?.[noteKey.sentence(lessonSlug, slug)]);
  const mine = words.filter((w) => written(w.slug));

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-stone-500">
          Chọn từ để đặt câu · đã viết {mine.length}/{words.length}
        </p>
        <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {words.map((w, i) => (
            <li key={w.slug}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                className={`rounded-lg px-2.5 py-1 ring-1 ring-inset ${i === index ? "bg-brand-600 text-white ring-brand-600" : written(w.slug) ? "bg-jade-50 text-jade-700 ring-jade-600" : "bg-white text-stone-800 ring-stone-200 hover:ring-brand-300"}`}
              >
                <span lang="zh-CN" className="font-han text-lg">{w.simplified}</span>
                {written(w.slug) && i !== index && <span className="ml-1 text-xs">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <SentenceEditor key={current.slug} lessonSlug={lessonSlug} word={current} words={words} known={known} />
        {index < words.length - 1 && (
          <div className="mt-4 text-right">
            <button type="button" onClick={() => setIndex(index + 1)} className="text-sm font-medium text-brand-700 hover:underline">
              Từ tiếp theo →
            </button>
          </div>
        )}
      </div>

      {mine.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold text-stone-900">Sổ câu của bạn ({mine.length})</h3>
          <ul className="divide-y divide-stone-100">
            {mine.map((w) => (
              <li key={w.slug} className="flex items-start justify-between gap-3 py-2">
                <p lang="zh-CN" className="font-han text-lg text-stone-900">{state.notes![noteKey.sentence(lessonSlug, w.slug)]!.text}</p>
                <button type="button" onClick={() => setIndex(words.indexOf(w))} className="shrink-0 text-sm text-brand-700 hover:underline">
                  Sửa
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
