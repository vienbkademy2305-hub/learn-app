"use client";
import { useMemo, useState } from "react";
import { checkParagraph, type ParagraphTask } from "@/domain/practice";
import { noteKey } from "@/domain/progress";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { CheckItem, useNote, WritingBox } from "./WritingBox";

export function ParagraphPractice({
  lessonSlug,
  task,
  words,
  knownChars,
  models,
}: {
  lessonSlug: string;
  task: ParagraphTask;
  words: Array<{ slug: string; simplified: string; pinyin: string }>;
  knownChars: string[];
  models: Array<{ simplified: string; vi: string | null }>;
}) {
  const [text, setText, { savedAt, flush }] = useNote(noteKey.paragraph(lessonSlug));
  const known = useMemo(() => new Set(knownChars), [knownChars]);
  const check = useMemo(() => checkParagraph(text, words, known), [text, words, known]);
  const [showModels, setShowModels] = useState(false);
  const used = new Set(check.usedWords);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-sm font-medium text-brand-700">Đề bài</p>
        <p className="mt-1 text-lg font-medium text-stone-900">{task.prompt}</p>
        <p className="mt-1 text-sm text-stone-500">
          Yêu cầu: ít nhất {task.minChars} chữ Hán, dùng ít nhất {task.minWords} từ của bài.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {task.hints.map((h) => (
            <li key={h} className="rounded-full bg-amber-50 px-3 py-1 text-amber-800 ring-1 ring-inset ring-amber-200">
              <span lang="zh-CN" className="font-han">{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <WritingBox value={text} onChange={setText} onBlur={flush} words={words} rows={6} label="Đoạn văn của bạn" placeholder="Viết đoạn văn ở đây…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-xs text-stone-400">{savedAt ? `Đã lưu ${new Date(savedAt).toLocaleString("vi-VN")}` : ""}</span>
          {text.trim() && <SpeakButtons text={text} label="đoạn văn của bạn" />}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-stone-900">Tự kiểm tra</h3>
        <ul className="space-y-1 text-sm">
          <CheckItem ok={check.hanCount >= task.minChars}>
            Độ dài: {check.hanCount}/{task.minChars} chữ Hán
          </CheckItem>
          <CheckItem ok={check.usedWords.length >= task.minWords}>
            Dùng từ của bài: {check.usedWords.length}/{task.minWords} từ
          </CheckItem>
          <CheckItem ok={check.sentenceCount >= 3} warn>
            Số câu: {check.sentenceCount} (nên có 3–5 câu, mỗi câu kết thúc bằng 。？！)
          </CheckItem>
          <CheckItem ok={check.unknown.length === 0} warn>
            {check.unknown.length === 0 ? (
              "Chỉ dùng chữ đã học"
            ) : (
              <>
                Chữ chưa học tới bài này: <span lang="zh-CN" className="font-han text-base">{check.unknown.join(" ")}</span>
              </>
            )}
          </CheckItem>
        </ul>
        <p className="mb-1.5 mt-4 text-sm text-stone-500">Từ của bài (xanh = đã dùng):</p>
        <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {words.map((w) => (
            <li key={w.slug} className={`rounded-lg px-2 py-0.5 text-sm ring-1 ring-inset ${used.has(w.slug) ? "bg-jade-50 text-jade-700 ring-jade-600" : "bg-stone-50 text-stone-500 ring-stone-200"}`}>
              <span lang="zh-CN" className="font-han text-base">{w.simplified}</span>
            </li>
          ))}
        </ul>
      </div>

      {models.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
          <button type="button" onClick={() => setShowModels((s) => !s)} aria-expanded={showModels} className="font-medium text-brand-700 hover:underline">
            {showModels ? "Ẩn câu gợi ý" : "Xem câu gợi ý từ bài học"}
          </button>
          {showModels && (
            <ul className="mt-2 space-y-1.5">
              {models.map((m) => (
                <li key={m.simplified}>
                  <span lang="zh-CN" className="font-han text-lg text-stone-900">{m.simplified}</span>
                  {m.vi && <span className="ml-2 text-sm text-stone-500">{m.vi}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
