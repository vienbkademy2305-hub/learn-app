"use client";
/**
 * AI conversation (docs/ENGAGEMENT_AI_PLAN.md §2): pick a scenario and level, chat by typing or by voice,
 * hear the AI's lines, get a correction after every message of yours and 3 ideas for what to say next.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { XP } from "@/domain/activity";
import { useAccount } from "@/features/account/account";
import { earnXp } from "@/features/activity/store";
import { speakChinese, stopSpeaking } from "@/features/audio/speech";
import { speakEnglish, stopEnglish } from "@/features/en/speech";
import { canRecognize, listen, recognizeError, type Listening } from "@/features/speaking/recognize";
import { LEVELS, scenariosOf, type ChatLang, type Scenario } from "../../../supabase/functions/chat-ai/scenarios";
import { askAi, type ChatReply } from "./client";

type Msg =
  | { role: "ai"; reply: ChatReply }
  | { role: "user"; text: string; feedback?: ChatReply["feedback"] };

const speak = (lang: ChatLang, text: string) => {
  if (lang === "zh") {
    stopSpeaking();
    speakChinese(text, 0.9);
  } else {
    stopEnglish();
    speakEnglish(text, 0.95);
  }
};

function Feedback({ fb }: { fb: ChatReply["feedback"] }) {
  if (!fb.fixed && !fb.notes.length && !fb.praise_vi) return null;
  return (
    <div className="ml-auto max-w-[85%] space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-stone-700 ring-1 ring-amber-200">
      {fb.fixed && (
        <p>
          <span className="font-semibold text-amber-800">Nên nói: </span>
          <span lang="en">{fb.fixed}</span>
        </p>
      )}
      {fb.notes.map((n, i) => (
        <p key={i}>
          <span className="text-rose-700 line-through">{n.wrong}</span> → <span className="font-medium text-jade-700">{n.right}</span>
          <span className="block text-xs text-stone-500">{n.why_vi}</span>
        </p>
      ))}
      {fb.praise_vi && <p className="text-xs text-stone-600">💬 {fb.praise_vi}</p>}
    </div>
  );
}

export function AiChat({ lang }: { lang: ChatLang }) {
  const account = useAccount();
  const accent = lang === "zh" ? "bg-brand-600 hover:bg-brand-700" : "bg-sky-700 hover:bg-sky-800";
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [level, setLevel] = useState(LEVELS[lang][1]!.id);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [rec, setRec] = useState<Listening | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);
  useEffect(() => () => (lang === "zh" ? stopSpeaking() : stopEnglish()), [lang]);

  if (account.status === "disabled") return <p className="rounded-xl bg-stone-100 p-4 text-sm text-stone-600">Hội thoại AI cần bật tài khoản.</p>;
  if (account.status === "loading") return null;
  if (account.status === "signed-out") {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-stone-700">
        Hãy <Link href="/login" className="font-semibold text-brand-700 underline">đăng nhập</Link> để trò chuyện với AI.
      </p>
    );
  }

  /** Ask the AI for the next line given the conversation (a user message already added, or none for the opening). */
  async function turn(sc: Scenario, lv: string, history: Msg[]) {
    setBusy(true);
    setError(null);
    setSuggestions([]);
    const turns = history.map((m) => (m.role === "ai" ? { role: "ai" as const, text: m.reply.reply } : { role: "user" as const, text: m.text }));
    const r = await askAi(sc.id, lv, turns);
    setBusy(false);
    if ("error" in r) return setError(r.error);
    const { answer } = r;
    setLeft(answer.left);
    setMsgs((cur) => {
      const next = [...cur];
      const last = next[next.length - 1];
      if (last?.role === "user") next[next.length - 1] = { ...last, feedback: answer.feedback };
      return [...next, { role: "ai", reply: answer }];
    });
    setSuggestions(answer.suggestions);
    if (history.length) earnXp(XP.chat);
    if (autoSpeak) speak(lang, answer.reply);
  }

  function start(sc: Scenario) {
    setScenario(sc);
    setMsgs([]);
    setShown({});
    void turn(sc, level, []);
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || busy || !scenario) return;
    const history: Msg[] = [...msgs, { role: "user", text: t }];
    setMsgs(history);
    setInput("");
    void turn(scenario, level, history);
  }

  function mic() {
    if (rec) return rec.stop();
    const l = listen(lang);
    setRec(l);
    setError(null);
    l.result.then(
      (alts) => setInput(alts[0] ?? ""),
      (e: Error) => setError(recognizeError(e.message)),
    ).finally(() => setRec(null));
  }

  if (!scenario) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-semibold text-stone-900">1. Chọn trình độ</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Trình độ">
            {LEVELS[lang].map((l) => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={level === l.id}
                onClick={() => setLevel(l.id)}
                className={`rounded-xl border px-4 py-2 text-left text-sm ${level === l.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:bg-stone-50"}`}
              >
                <span className="block font-semibold">{l.label}</span>
                <span className="block text-xs opacity-70">{l.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-stone-900">2. Chọn tình huống</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {scenariosOf(lang).map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => start(s)} className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:bg-stone-50">
                  <span className="text-3xl" aria-hidden>{s.icon}</span>
                  <span>
                    <span className="block font-semibold text-stone-900">{s.title_vi}</span>
                    <span className="block text-sm text-stone-500">{s.blurb_vi}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-stone-500">
          AI miễn phí (Google Gemini) đóng vai người bản xứ, đáp lại bạn và sửa lỗi sau mỗi câu. Nội dung bạn gõ được gửi tới Google để AI trả lời; không nhập thông tin cá nhân.
          Mỗi câu bạn gửi được +{XP.chat} XP cho chuỗi ngày học.
        </p>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm shadow-sm">
        <span className="text-xl" aria-hidden>{scenario.icon}</span>
        <span className="font-semibold text-stone-900">{scenario.title_vi}</span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">{level}</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-600">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Tự đọc
        </label>
        <button
          type="button"
          onClick={() => {
            setScenario(null);
            setMsgs([]);
            setError(null);
            if (lang === "zh") stopSpeaking(); else stopEnglish();
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50"
        >
          Đổi tình huống
        </button>
      </div>

      <div className="space-y-3 rounded-2xl bg-stone-50 p-3 sm:p-4" aria-live="polite">
        {msgs.map((m, i) =>
          m.role === "ai" ? (
            <div key={i} className="max-w-[85%] space-y-1">
              <div className="rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm ring-1 ring-stone-200">
                <p lang={lang === "zh" ? "zh-CN" : "en"} className={lang === "zh" ? "font-han text-xl" : "text-lg"}>{m.reply.reply}</p>
                {lang === "zh" && shown[i] && m.reply.pinyin && <p className="mt-1 text-sm text-stone-500">{m.reply.pinyin}</p>}
                {shown[i] && <p className="mt-1 text-sm text-stone-600">{m.reply.reply_vi}</p>}
              </div>
              <div className="flex gap-3 text-xs">
                <button type="button" onClick={() => speak(lang, m.reply.reply)} className="font-semibold text-stone-600 hover:underline">🔊 Nghe</button>
                <button type="button" onClick={() => setShown((s) => ({ ...s, [i]: !s[i] }))} className="font-semibold text-stone-600 hover:underline">
                  {shown[i] ? "Ẩn dịch" : lang === "zh" ? "Dịch + pinyin" : "Dịch"}
                </button>
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-1.5">
              <p lang={lang === "zh" ? "zh-CN" : "en"} className={`ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-white ${lang === "zh" ? "bg-brand-600" : "bg-sky-700"}`}>
                {m.text}
              </p>
              {m.feedback && <Feedback fb={m.feedback} />}
            </div>
          ),
        )}
        {busy && <p className="text-sm text-stone-500">AI đang nghĩ…</p>}
        <div ref={endRef} />
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {suggestions.length > 0 && !busy && (
        <div className="flex flex-wrap gap-2" aria-label="Gợi ý câu trả lời">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setInput(s)} className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          maxLength={500}
          lang={lang === "zh" ? "zh-CN" : "en"}
          placeholder={lang === "zh" ? "Nhập câu tiếng Trung (hoặc bấm 🎤)…" : "Type in English (or press 🎤)…"}
          aria-label="Câu của bạn"
          className="min-h-12 flex-1 resize-none rounded-xl border border-stone-300 px-3 py-2"
        />
        {canRecognize() && (
          <button type="button" onClick={mic} aria-label={rec ? "Dừng ghi" : "Nói"} className={`size-12 rounded-xl text-xl ${rec ? "animate-pulse bg-rose-600 text-white" : "bg-stone-200 hover:bg-stone-300"}`}>
            🎤
          </button>
        )}
        <button type="submit" disabled={busy || !input.trim()} className={`h-12 rounded-xl px-5 font-semibold text-white disabled:bg-stone-300 ${accent}`}>
          Gửi
        </button>
      </form>
      {left !== null && <p className="text-xs text-stone-400">Còn {left} lượt AI hôm nay.</p>}
    </div>
  );
}
