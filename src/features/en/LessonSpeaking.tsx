"use client";
/**
 * "Luyện nói" step of an English lesson: read the lesson's words, example sentences and dialogue lines aloud,
 * each scored by OpenPronounce; the best score per item is kept in the English progress (./progress.ts).
 */
import { firstLetterHint } from "@/domain/speech-match";
import { SayItBackDeck } from "@/features/speaking/SayItBackDeck";
import { DialogueRoleplay, type RoleLine } from "./DialogueRoleplay";
import { PronounceCheck } from "./PronounceCheck";
import { saveSpeaking, speakKey, useEnProgress } from "./progress";
import { scoreTone } from "./pronounce";
import { ServerStatus } from "./SpeakingLab";
import { Say } from "./speech";

export type SpeakItem = { group: "word" | "sentence" | "dialogue"; text: string; vi: string; extra?: string };

const GROUPS: Array<{ group: SpeakItem["group"]; title: string; hint: string }> = [
  { group: "word", title: "1. Từ vựng của buổi", hint: "Nghe mẫu, đọc từng từ thật rõ âm cuối và trọng âm." },
  { group: "sentence", title: "2. Câu ví dụ", hint: "Đọc cả câu liền mạch, không ngắt từng từ." },
  { group: "dialogue", title: "3. Đọc lời thoại", hint: "Đọc theo từng câu của hội thoại, như đang nói chuyện thật." },
];
/** A score at or above this counts the item as "đạt". */
export const SPEAK_PASS = 80;

export function LessonSpeaking({ slug, items, dialogue = [] }: { slug: string; items: SpeakItem[]; dialogue?: RoleLine[] }) {
  const [progress, update, hydrated] = useEnProgress();
  const scores = items.map((i) => (hydrated ? progress.speaking[speakKey(slug, i.text)] : undefined));
  const tried = scores.filter(Boolean);
  const passed = scores.filter((s) => s && s.best >= SPEAK_PASS).length;
  const avg = tried.length ? Math.round(tried.reduce((a, s) => a + s!.best, 0) / tried.length) : null;

  return (
    <div className="space-y-5">
      <ServerStatus />
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-stone-700">
          Đọc to từng mục, máy chấm cho điểm và chỉ ra âm sai. Đạt từ <strong>{SPEAK_PASS}</strong> điểm là qua. Điểm cao nhất được lưu vào tiến độ buổi học.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span>Đã luyện <strong>{tried.length}/{items.length}</strong></span>
          <span>Đạt <strong className="text-jade-700">{passed}/{items.length}</strong></span>
          {avg !== null && <span>Điểm trung bình <strong>{avg}</strong></span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full bg-jade-600 transition-all" style={{ width: `${items.length ? (passed / items.length) * 100 : 0}%` }} />
        </div>
      </section>

      {dialogue.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-stone-900">🗣️ Hội thoại đóng vai</h2>
            <p className="text-sm text-stone-500">Nói lời của bạn từ câu tiếng Việt. Chưa biết nói thế nào thì bấm 💡 Gợi ý (chữ cái đầu → cả câu).</p>
          </div>
          <DialogueRoleplay slug={slug} lines={dialogue} />
        </section>
      )}

      {items.some((i) => i.group === "sentence") && (
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-stone-900">🗣️ Nói từ tiếng Việt sang tiếng Anh</h2>
            <p className="text-sm text-stone-500">Nhìn câu tiếng Việt, tự nói bằng tiếng Anh. Máy nghe và tô đỏ chỗ còn thiếu.</p>
          </div>
          <SayItBackDeck
            lang="en"
            items={items.filter((i) => i.group === "sentence").map((i) => ({ vi: i.vi, answer: i.text, hints: [firstLetterHint(i.text), i.text] }))}
            onScore={(it, score) => update(saveSpeaking(speakKey(slug, `vi|${it.answer}`), score))}
          />
        </section>
      )}

      <h2 className="pt-2 text-lg font-bold text-stone-900">🎯 Đọc theo — chấm phát âm</h2>
      {GROUPS.map(({ group, title, hint }) => {
        const list = items.map((it, i) => ({ it, s: scores[i] })).filter(({ it }) => it.group === group);
        if (!list.length) return null;
        return (
          <section key={group} className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900">{title}</h2>
              <p className="text-sm text-stone-500">{hint}</p>
            </div>
            <ol className="space-y-2">
              {list.map(({ it, s }) => {
                const tone = s ? scoreTone(s.best) : null;
                return (
                  <li key={it.text} className="flex flex-wrap items-start gap-3 rounded-xl border border-stone-200 bg-white p-4">
                    <div className="min-w-0 flex-1">
                      <p lang="en" className={group === "word" ? "text-xl font-semibold text-stone-900" : "text-lg text-stone-900"}>
                        {group === "dialogue" && it.extra && <span className="mr-2 text-sm font-semibold text-sky-800">{it.extra}:</span>}
                        {it.text}
                        {group === "word" && it.extra && <span className="ml-3 font-mono text-sm font-normal text-stone-500">{it.extra}</span>}
                      </p>
                      <p className="mt-1 text-sm text-stone-500">{it.vi}</p>
                    </div>
                    {s && tone && (
                      <span title={`Cao nhất ${s.best} · lần gần nhất ${s.last} · ${s.tries} lần`} className={`rounded-lg px-2 py-0.5 text-sm font-bold ${tone.cls}`}>
                        {s.best}
                      </span>
                    )}
                    <Say text={it.text} slow />
                    <PronounceCheck text={it.text} compact onScore={(score) => update(saveSpeaking(speakKey(slug, it.text), score))} />
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
