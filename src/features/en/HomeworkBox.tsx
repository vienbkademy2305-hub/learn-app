"use client";
import { useEffect, useState } from "react";
import { countWords } from "@/domain/en-grade";
import { saveHomework, useEnProgress } from "./progress";

/** Homework prompt + writing box with a live word count; the draft stays in this browser. */
export function HomeworkBox({
  slug,
  prompt,
  promptEn,
  words,
  minutes,
  vocabulary,
}: {
  slug: string;
  prompt: string;
  promptEn?: string;
  words?: { min: number; max: number };
  minutes?: number;
  vocabulary: string[];
}) {
  const [progress, update, hydrated] = useEnProgress();
  const saved = progress.homework[slug];
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (hydrated && !loaded) {
      setText(saved?.text ?? "");
      setLoaded(true);
    }
  }, [hydrated, loaded, saved]);

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      if (text !== (saved?.text ?? "")) update(saveHomework(slug, text, saved?.done ?? false));
    }, 600);
    return () => window.clearTimeout(t);
  }, [text, loaded, saved, slug, update]);

  const n = countWords(text);
  const inRange = words ? n >= words.min && n <= words.max : n > 0;
  const lower = text.toLowerCase();
  const used = vocabulary.filter((v) => lower.includes(v.toLowerCase()));

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Bài viết về nhà</h2>
        <p className="mt-2 text-stone-800">{prompt}</p>
        {promptEn && <p lang="en" className="mt-1 whitespace-pre-wrap text-stone-500 italic">{promptEn}</p>}
        <p className="mt-2 text-sm text-stone-500">
          {words && `${words.min}–${words.max} từ`}
          {minutes && ` · khoảng ${minutes} phút`} · Tự đọc lại và sửa lỗi trước khi nộp (a/an/the, -s số nhiều, viết hoa I, dấu phẩy nối câu).
        </p>
      </div>
      <textarea
        lang="en"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        spellCheck={false}
        placeholder="Write here…"
        className="w-full rounded-xl border border-stone-300 p-3 text-base leading-relaxed focus:border-sky-500 focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className={inRange ? "font-medium text-jade-700" : "text-stone-500"}>
          {n} từ{words && !inRange && (n < words.min ? ` — cần thêm ${words.min - n}` : ` — dư ${n - words.max}`)}
        </span>
        <span className="text-stone-500">
          Từ của buổi đã dùng: {used.length}/{vocabulary.length}
        </span>
        <button
          type="button"
          disabled={!inRange}
          onClick={() => update(saveHomework(slug, text, !(saved?.done ?? false)))}
          className={`rounded-xl px-4 py-2 font-semibold ${saved?.done ? "bg-jade-600 text-white" : "bg-sky-700 text-white hover:bg-sky-800 disabled:bg-stone-300"}`}
        >
          {saved?.done ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
        </button>
      </div>
      {used.length > 0 && (
        <p className="text-xs text-stone-500" lang="en">
          {used.join(" · ")}
        </p>
      )}
      <p className="text-xs text-stone-400">Bài viết chỉ lưu trên trình duyệt này. Muốn được chấm theo tiêu chí IELTS, dán bài vào buổi học với gia sư (skill english-tutor).</p>
    </section>
  );
}
