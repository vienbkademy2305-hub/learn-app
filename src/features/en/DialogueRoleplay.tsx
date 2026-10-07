"use client";
/**
 * Role-play of the lesson dialogue (Luyện nói step): pick a character; the other lines are read aloud,
 * your lines are shown in Vietnamese and you say them in English (hints: first letters, then the full line).
 */
import { useEffect, useState } from "react";
import { firstLetterHint } from "@/domain/speech-match";
import { SayItBack } from "@/features/speaking/SayItBack";
import { saveSpeaking, speakKey, useEnProgress } from "./progress";
import { speakEnglish, stopEnglish } from "./speech";

export type RoleLine = { speaker: string; text: string; vi: string };

export function DialogueRoleplay({ slug, lines }: { slug: string; lines: RoleLine[] }) {
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const [me, setMe] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [, update] = useEnProgress();

  // Partner lines play by themselves when reached.
  useEffect(() => {
    const line = lines[at];
    if (!me || !line || line.speaker === me) return;
    speakEnglish(line.text, 0.95);
    return () => stopEnglish();
  }, [me, at, lines]);

  if (!me)
    return (
      <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
        <p className="text-stone-700">Chọn vai của bạn. Máy đọc lời nhân vật kia, đến lượt bạn thì nhìn câu tiếng Việt và nói bằng tiếng Anh.</p>
        <div className="flex flex-wrap gap-2">
          {speakers.map((s) => (
            <button key={s} type="button" onClick={() => (setMe(s), setAt(0))} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Tôi đóng vai {s}
            </button>
          ))}
        </div>
      </div>
    );

  const done = at >= lines.length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-stone-700">Bạn là <strong>{me}</strong></span>
        <span className="text-stone-500">Lượt {Math.min(at + 1, lines.length)}/{lines.length}</span>
        <button type="button" onClick={() => (stopEnglish(), setMe(null))} className="text-sky-800 hover:underline">Đổi vai</button>
        <button type="button" onClick={() => (stopEnglish(), setAt(0))} className="text-sky-800 hover:underline">Làm lại từ đầu</button>
      </div>
      <ol className="space-y-2">
        {lines.slice(0, Math.min(at + 1, lines.length)).map((l, i) => {
          const mine = l.speaker === me;
          const current = i === at;
          return (
            <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`w-full max-w-xl ${mine ? "" : "rounded-xl bg-white p-3 ring-1 ring-stone-200"}`}>
                <p className="text-xs font-semibold text-sky-800">{l.speaker}{mine && " (bạn)"}</p>
                {mine ? (
                  current ? (
                    <SayItBack
                      compact
                      lang="en"
                      vi={l.vi}
                      answer={l.text}
                      hints={[firstLetterHint(l.text), l.text]}
                      play={() => speakEnglish(l.text, 0.9)}
                      onScore={(score) => update(saveSpeaking(speakKey(slug, `rp|${l.text}`), score))}
                    />
                  ) : (
                    <p lang="en" className="rounded-xl bg-sky-700 px-3 py-2 text-white">{l.text}</p>
                  )
                ) : (
                  <>
                    <p lang="en" className="text-stone-900">{l.text}</p>
                    <p className="text-sm text-stone-500">{l.vi}</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!done ? (
        <div className="flex flex-wrap gap-2">
          {lines[at]!.speaker !== me && (
            <button type="button" onClick={() => speakEnglish(lines[at]!.text, 0.95)} className="rounded-xl px-4 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50">
              🔊 Nghe lại
            </button>
          )}
          <button type="button" onClick={() => (stopEnglish(), setAt((n) => n + 1))} className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900">
            {at === lines.length - 1 ? "Kết thúc" : "Lượt tiếp →"}
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-jade-50 p-3 font-medium text-jade-700">
          Xong hội thoại! 🎉 Đổi vai để luyện phần còn lại, hoặc làm lại để nói trôi hơn.
        </p>
      )}
    </div>
  );
}
