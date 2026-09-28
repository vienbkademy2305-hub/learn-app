"use client";
import { useEffect, useRef, useState } from "react";
import { saveNote } from "@/domain/progress";
import { useProgress } from "@/features/progress/store";

const PUNCTUATION = ["，", "。", "？", "！", "、"];

/** Text kept in sync with a saved note: local while typing, saved after a short pause and on blur. */
export function useNote(key: string): [string, (text: string) => void, { savedAt: string | null; flush: () => void }] {
  const [state, update, hydrated] = useProgress();
  const saved = state.notes?.[key];
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const value = pending.current;
      pending.current = null;
      update((s) => saveNote(s, key, value));
    }
  };

  // Save what is still pending when the editor switches to another note or unmounts.
  useEffect(() => flush, [key]);

  const set = (value: string) => {
    setText(value);
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  return [text ?? (hydrated ? (saved?.text ?? "") : ""), set, { savedAt: saved?.at ?? null, flush }];
}

/**
 * Textarea for Chinese writing plus chips that insert lesson words and
 * punctuation at the cursor, for learners without a Chinese keyboard.
 */
export function WritingBox({
  value,
  onChange,
  onBlur,
  words,
  rows = 3,
  label,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  words: Array<{ slug: string; simplified: string; pinyin: string }>;
  rows?: number;
  label: string;
  placeholder?: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [showBank, setShowBank] = useState(false);

  const insert = (piece: string) => {
    const el = area.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + piece + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + piece.length, start + piece.length);
    });
  };

  const chip = "rounded-lg bg-stone-50 px-2 py-1 ring-1 ring-inset ring-stone-200 hover:bg-white hover:ring-brand-300";
  return (
    <div className="space-y-2">
      <textarea
        ref={area}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        lang="zh-CN"
        aria-label={label}
        placeholder={placeholder}
        className="font-han w-full rounded-xl px-4 py-3 text-xl leading-relaxed ring-1 ring-inset ring-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {PUNCTUATION.map((p) => (
          <button key={p} type="button" onClick={() => insert(p)} className={`${chip} font-han w-9`} aria-label={`Chèn dấu ${p}`}>
            {p}
          </button>
        ))}
        <button type="button" onClick={() => setShowBank((s) => !s)} aria-expanded={showBank} className="ml-1 rounded-lg px-2 py-1 font-medium text-brand-700 hover:bg-brand-50">
          {showBank ? "Ẩn bảng từ" : "Chèn từ của bài"}
        </button>
      </div>
      {showBank && (
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-xl bg-stone-50/60 p-2" aria-label="Bảng từ để chèn">
          {words.map((w) => (
            <button key={w.slug} type="button" onClick={() => insert(w.simplified)} className={chip} title={w.pinyin}>
              <span lang="zh-CN" className="font-han text-base">{w.simplified}</span> <span className="text-xs text-stone-500">{w.pinyin}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-500">Gõ bằng bộ gõ tiếng Trung (Pinyin) trên máy, hoặc bấm “Chèn từ của bài”. Bài viết được tự lưu trên trình duyệt này.</p>
    </div>
  );
}

export function CheckItem({ ok, warn = false, children }: { ok: boolean; warn?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex gap-2 ${ok ? "text-jade-700" : warn ? "text-amber-700" : "text-brand-700"}`}>
      <span aria-hidden="true">{ok ? "✓" : warn ? "!" : "✗"}</span>
      <span>{children}</span>
    </li>
  );
}
