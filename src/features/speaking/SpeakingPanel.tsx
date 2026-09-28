"use client";
/**
 * Record → listen back → on-device score (docs/SPEAKING_PLAN.md).
 * Words: tone score per syllable. Sentences: intonation vs the model recording.
 * Only pitch is measured; the panel says so next to every score.
 */
import { useEffect, useState } from "react";
import { playbackFor } from "@/domain/listening";
import { recordSpeaking } from "@/domain/progress";
import {
  applySandhi,
  assessSentence,
  assessWord,
  tonesFromKey,
  toneTemplate,
  type SentenceAssessment,
  type WordAssessment,
} from "@/domain/speaking/assess";
import { AudioButtons } from "@/features/audio/AudioButtons";
import { SpeakButtons } from "@/features/audio/SpeakButtons";
import { useProgress } from "@/features/progress/store";
import { assetUrl } from "@/lib/storage-url";
import { ContourChart } from "./ContourChart";
import { referenceFrames, useRecorder } from "./recorder";

export type SpeakTarget =
  | { kind: "word"; key: string; hanzi: string; pinyin: string; pinyinKey: string; meaning: string | null }
  | {
      kind: "sentence";
      key: string;
      hanzi: string;
      pinyin: string | null;
      vi: string | null;
      audio: { normal?: string; slow?: string };
      audioMs?: { normal?: number; slow?: number };
    };

const TONE_NAMES: Record<number, string> = { 1: "thanh 1", 2: "thanh 2", 3: "thanh 3", 4: "thanh 4", 5: "thanh nhẹ" };

function maxSeconds(t: SpeakTarget): number {
  if (t.kind === "word") return Math.min(5, 1.6 + 0.7 * tonesFromKey(t.pinyinKey).length);
  const ms = t.audioMs?.normal ?? 2500;
  return Math.min(12, (ms / 1000) * 2 + 1.5);
}

function scoreTone(score: number) {
  return score >= 80 ? "text-jade-700" : score >= 60 ? "text-amber-700" : "text-brand-700";
}

export function SpeakingPanel({ target }: { target: SpeakTarget }) {
  const rec = useRecorder();
  const [state, update, hydrated] = useProgress();
  const [word, setWord] = useState<WordAssessment | null>(null);
  const [sentence, setSentence] = useState<SentenceAssessment | null>(null);
  const [refError, setRefError] = useState(false);
  const best = state.speaking?.[target.key];

  const expected = target.kind === "word" ? applySandhi(target.hanzi, tonesFromKey(target.pinyinKey)) : [];
  const refUrl = target.kind === "sentence" ? (() => {
    const pb = playbackFor(target.audio, target.audioMs, "normal");
    return pb ? assetUrl(pb.key) : null;
  })() : null;

  // Score each new recording once.
  useEffect(() => {
    const r = rec.recording;
    if (!r) return;
    let cancelled = false;
    if (target.kind === "word") {
      const a = assessWord(r.frames, expected, r.stats);
      setWord(a);
      if (a.status === "ok" && a.score !== null) update((s) => recordSpeaking(s, target.key, a.score!));
    } else if (refUrl) {
      referenceFrames(refUrl)
        .then((ref) => {
          if (cancelled) return;
          const a = assessSentence(r.frames, ref, r.stats);
          setSentence(a);
          if (a.status === "ok" && a.score !== null) update((s) => recordSpeaking(s, target.key, a.score!));
        })
        .catch(() => !cancelled && setRefError(true));
    }
    return () => {
      cancelled = true;
    };
    // expected/refUrl derive from target, which keys this component.
  }, [rec.recording]);

  const syllables = target.kind === "word" ? target.pinyin.split(/\s+/) : [];
  const result = target.kind === "word" ? word : sentence;
  const recording = rec.state === "recording";

  return (
    <div className="space-y-4" data-speaking={target.key}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p lang="zh-CN" className={`font-han text-stone-900 ${target.kind === "word" ? "text-5xl" : "text-2xl"}`}>{target.hanzi}</p>
          {target.pinyin && <p className="mt-1 text-lg text-brand-700">{target.pinyin}</p>}
          {target.kind === "word" && target.meaning && <p className="text-sm text-stone-600">{target.meaning}</p>}
          {target.kind === "sentence" && target.vi && <p className="text-sm text-stone-600">{target.vi}</p>}
          {target.kind === "word" && (
            <p className="mt-1 text-xs text-stone-500">
              Thanh cần đọc: {expected.map((t) => TONE_NAMES[t]).join(" · ")}
              {expected.some((t, i) => t !== tonesFromKey(target.pinyinKey)[i]) && " (đã tính biến điệu)"}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <span className="text-stone-500">Nghe mẫu</span>
          {target.kind === "word" ? <SpeakButtons text={target.hanzi} label={target.pinyin} /> : <AudioButtons audio={target.audio} durations={target.audioMs} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <button type="button" onClick={rec.stop} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 font-semibold text-white">
            <span className="size-3 animate-pulse rounded-full bg-white" aria-hidden="true" /> Dừng ({rec.elapsed.toFixed(1)}s / {maxSeconds(target).toFixed(0)}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWord(null);
              setSentence(null);
              setRefError(false);
              rec.start(maxSeconds(target));
            }}
            disabled={rec.state === "requesting" || rec.state === "processing"}
            className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
          >
            🎙 {rec.recording ? "Ghi âm lại" : "Ghi âm"}
          </button>
        )}
        {rec.state === "requesting" && <span className="text-sm text-stone-500">Đang xin quyền dùng micro…</span>}
        {rec.state === "processing" && <span className="text-sm text-stone-500">Đang phân tích…</span>}
        {rec.recording && !recording && <audio src={rec.recording.url} controls className="h-9 max-w-full" aria-label="Nghe lại giọng bạn" />}
        {hydrated && best && (
          <span className="text-xs text-stone-500">
            Cao nhất: <strong className={scoreTone(best.best)}>{best.best}</strong> · {best.attempts} lần
          </span>
        )}
      </div>
      {recording && <p className="text-sm text-stone-500">Đang ghi âm — đọc {target.kind === "word" ? "từ" : "câu"} rõ ràng, rồi bấm Dừng (tự dừng sau {maxSeconds(target).toFixed(0)} giây).</p>}
      {rec.error && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800" role="alert">{rec.error}</p>}
      {refError && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800" role="alert">Không tải được audio mẫu để so sánh. Kiểm tra kết nối mạng rồi thử lại.</p>}

      {result && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4" role="status" aria-live="polite">
          {result.status === "ok" && result.score !== null ? (
            <div className="flex flex-wrap items-end gap-3">
              <p className={`text-4xl font-bold ${scoreTone(result.score)}`}>
                {result.score}
                <span className="text-lg font-medium text-stone-400">/100</span>
              </p>
              <p className="pb-1 text-sm text-stone-600">{target.kind === "word" ? "Điểm thanh điệu (ước lượng)" : "Điểm ngữ điệu so với câu mẫu (ước lượng)"}</p>
            </div>
          ) : null}
          <p className="font-medium text-stone-800">{result.message}</p>

          {target.kind === "word" && word?.status === "ok" && (
            <>
              <ul className="flex flex-wrap gap-2">
                {word.syllables.map((s, i) => (
                  <li
                    key={i}
                    className={`rounded-xl px-3 py-2 text-sm ring-1 ring-inset ${
                      s.score === null ? "bg-stone-50 ring-stone-200" : s.score >= 60 ? "bg-jade-50 ring-jade-100" : "bg-brand-50 ring-brand-200"
                    }`}
                  >
                    <span className="font-semibold text-stone-900">{syllables[i] ?? `âm ${i + 1}`}</span>{" "}
                    {s.score === null ? (
                      <span className="text-stone-500">thanh nhẹ — không chấm</span>
                    ) : (
                      <>
                        <span className={scoreTone(s.score)}>{s.score}</span>
                        {s.heard !== null && s.heard !== s.expected && s.score < 60 && <span className="text-stone-600"> · nghe giống {TONE_NAMES[s.heard]}</span>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {word.syllables.filter((s) => s.tip).map((s, i) => (
                <p key={i} className="text-sm text-stone-700">
                  💡 {s.tip}
                </p>
              ))}
              <ContourChart
                label="Đường cao độ giọng bạn so với khuôn thanh điệu"
                segments={word.syllables.map((s, i) => ({
                  learner: s.contour,
                  target: toneTemplate(s.expected),
                  ok: s.score === null ? null : s.score >= 60,
                  caption: syllables[i],
                }))}
              />
            </>
          )}
          {target.kind === "sentence" && sentence?.status === "ok" && (
            <ContourChart label="Đường cao độ giọng bạn so với câu mẫu" segments={[{ learner: sentence.learner, target: sentence.reference, ok: (sentence.score ?? 0) >= 60 }]} />
          )}
          <p className="text-xs text-stone-500">
            Máy chỉ chấm <strong>cao độ giọng</strong> ({target.kind === "word" ? "thanh điệu" : "lên xuống giọng"}), chưa chấm phụ âm, nguyên âm hay độ rõ chữ. Điểm là ước lượng — hãy nghe lại giọng mình cạnh mẫu.
          </p>
        </div>
      )}
    </div>
  );
}
