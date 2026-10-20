"use client";
/**
 * "Luyện các từ sai": goes through the words of a pronunciation report that were not right, one at a time — model voice, tip,
 * read it again with the same check — and moves on when the word reaches 85 %. docs/ELSA_PRONUNCIATION_PLAN.md §4.
 */
import { useState } from "react";
import { GOOD_FROM, levelOf, type WordReport } from "@/domain/pron-report";
import { earnXp } from "@/features/activity/store";
import { QuizResult } from "@/features/quiz/QuizResult";
import { QuizButton, QuizShell } from "@/features/quiz/QuizShell";
import { PronounceCheck } from "./PronounceCheck";
import { speakEnglish } from "./speech";

export function WeakPractice({ words, onClose }: { words: WordReport[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const [start] = useState(() => Date.now());
  const w = words[i];
  const clean = w ? w.word.replace(/[^A-Za-z'-]/g, "") : "";
  const score = w ? (best[clean] ?? null) : null;
  const passed = score !== null && score >= GOOD_FROM;
  const fixed = Object.values(best).filter((s) => s >= GOOD_FROM).length;

  if (done || !w) {
    return <QuizResult correct={fixed} total={words.length} seconds={(Date.now() - start) / 1000} xp={fixed * 2} title={fixed === words.length ? "Đã sửa hết các từ sai!" : "Luyện xong lượt này"} onRetry={() => { setI(0); setDone(false); setBest({}); }} onSkip={onClose} />;
  }
  const next = () => {
    if (passed) earnXp(2);
    if (i + 1 >= words.length) setDone(true);
    else setI(i + 1);
  };
  return (
    <QuizShell
      progress={i / words.length}
      badge={fixed}
      onExit={onClose}
      title={`Từ ${i + 1}/${words.length}`}
      footer={<QuizButton state={passed ? "ok" : "idle"} onClick={next}>{passed ? (i + 1 >= words.length ? "Xem kết quả" : "Từ tiếp theo") : "Bỏ qua từ này"}</QuizButton>}
    >
      <div key={clean} className="space-y-5">
        <div className="rounded-3xl bg-neutral-900 p-5 text-center">
          <p lang="en" className="text-5xl font-extrabold">{clean}</p>
          {w.ipa && <p className="mt-2 font-mono text-xl text-neutral-400">{w.ipa}</p>}
          <p className="mt-2 text-sm text-neutral-500">Lần trước: {w.percent}%{w.heard ? ` · máy nghe thành “${w.heard}”` : ""}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => speakEnglish(clean, 0.6)} className="h-12 rounded-full bg-sky-500/15 px-5 font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🐢 Mẫu chậm</button>
            <button type="button" onClick={() => speakEnglish(clean, 0.95)} className="h-12 rounded-full bg-sky-500/15 px-5 font-bold text-sky-300 ring-1 ring-sky-500/40 hover:bg-sky-500/25">🔊 Mẫu</button>
          </div>
        </div>
        {w.tip && <p className="rounded-2xl bg-amber-950 p-4 text-lg leading-snug text-amber-200">💡 {w.tip}</p>}
        <div className="rounded-3xl bg-white p-3 text-stone-900">
          <PronounceCheck text={clean} nested onScore={(s) => setBest((b) => ({ ...b, [clean]: Math.max(b[clean] ?? 0, s) }))} />
        </div>
        {score !== null && (
          <p className={`rounded-2xl p-4 text-center text-xl font-extrabold ${passed ? "bg-emerald-950 text-emerald-400" : levelOf(score) === "ok" ? "bg-amber-950 text-amber-300" : "bg-red-950 text-red-300"}`}>
            {passed ? `✓ ${score}% — đã đạt!` : `${score}% — thử đọc lại chậm hơn, rõ âm cuối nhé.`}
          </p>
        )}
      </div>
    </QuizShell>
  );
}
