"use client";
/**
 * Role-play of a dialogue (English Luyện nói step, Chinese practice): pick a character; the other lines are
 * read aloud, your lines are shown in Vietnamese and you say them (hints: first letters / pinyin, then the line).
 */
import { useEffect, useState } from "react";
import { firstLetterHint, type SpeechLang } from "@/domain/speech-match";
import { speakChinese, stopSpeaking } from "@/features/audio/speech";
import { speakEnglish, stopEnglish } from "@/features/en/speech";
import { SayItBack } from "./SayItBack";

export type RoleLine = { speaker: string; text: string; vi: string; pinyin?: string };

const say = (lang: SpeechLang, text: string) => (lang === "zh" ? speakChinese(text, 0.8) : speakEnglish(text, 0.95));
const hush = (lang: SpeechLang) => (lang === "zh" ? stopSpeaking() : stopEnglish());

export function DialogueRoleplay({ lines, lang, onScore }: { lines: RoleLine[]; lang: SpeechLang; onScore?: (line: RoleLine, score: number) => void }) {
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  const [me, setMe] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const zh = lang === "zh";
  const langName = zh ? "tiếng Trung" : "tiếng Anh";

  // Partner lines play by themselves when reached.
  useEffect(() => {
    const line = lines[at];
    if (!me || !line || line.speaker === me) return;
    say(lang, line.text);
    return () => hush(lang);
  }, [me, at, lines, lang]);

  if (!me)
    return (
      <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
        <p className="text-stone-700">Chọn vai của bạn. Máy đọc lời nhân vật kia, đến lượt bạn thì nhìn câu tiếng Việt và nói bằng {langName}.</p>
        <div className="flex flex-wrap gap-2">
          {speakers.map((s) => (
            <button key={s} type="button" onClick={() => (setMe(s), setAt(0))} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Tôi đóng vai <span lang={zh ? "zh-CN" : undefined}>{s}</span>
            </button>
          ))}
        </div>
      </div>
    );

  const done = at >= lines.length;
  const text = (l: RoleLine) => (
    <>
      <p lang={zh ? "zh-CN" : "en"} className={zh ? "font-han text-xl text-stone-900" : "text-stone-900"}>{l.text}</p>
      {l.pinyin && <p className="text-sm text-brand-700">{l.pinyin}</p>}
    </>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-stone-700">Bạn là <strong lang={zh ? "zh-CN" : undefined}>{me}</strong></span>
        <span className="text-stone-500">Lượt {Math.min(at + 1, lines.length)}/{lines.length}</span>
        <button type="button" onClick={() => (hush(lang), setMe(null))} className="text-sky-800 hover:underline">Đổi vai</button>
        <button type="button" onClick={() => (hush(lang), setAt(0))} className="text-sky-800 hover:underline">Làm lại từ đầu</button>
      </div>
      <ol className="space-y-2">
        {lines.slice(0, Math.min(at + 1, lines.length)).map((l, i) => {
          const mine = l.speaker === me;
          return (
            <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`w-full max-w-xl ${mine ? "" : "rounded-xl bg-white p-3 ring-1 ring-stone-200"}`}>
                <p className="text-xs font-semibold text-sky-800"><span lang={zh ? "zh-CN" : undefined}>{l.speaker}</span>{mine && " (bạn)"}</p>
                {mine ? (
                  i === at ? (
                    <SayItBack
                      compact
                      lang={lang}
                      vi={l.vi}
                      answer={l.text}
                      hints={zh ? [l.pinyin ?? "", l.text].filter(Boolean) : [firstLetterHint(l.text), l.text]}
                      answerNote={l.pinyin}
                      play={() => say(lang, l.text)}
                      onScore={(score) => onScore?.(l, score)}
                    />
                  ) : (
                    <div className="rounded-xl bg-sky-700 px-3 py-2 text-white [&_p]:text-white">{text(l)}</div>
                  )
                ) : (
                  <>
                    {text(l)}
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
            <button type="button" onClick={() => say(lang, lines[at]!.text)} className="rounded-xl px-4 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-50">
              🔊 Nghe lại
            </button>
          )}
          <button type="button" onClick={() => (hush(lang), setAt((n) => n + 1))} className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900">
            {at === lines.length - 1 ? "Kết thúc" : "Lượt tiếp →"}
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-jade-50 p-3 font-medium text-jade-700">Xong hội thoại! 🎉 Đổi vai để luyện phần còn lại, hoặc làm lại để nói trôi hơn.</p>
      )}
    </div>
  );
}
