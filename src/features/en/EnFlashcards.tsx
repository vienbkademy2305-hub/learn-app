"use client";
/**
 * English flashcards (E4): cards of the chosen lessons, due cards first, Leitner boxes shared with
 * the English progress store. Front: English (or Vietnamese in reverse mode); back: the other side + example.
 */
import { useEffect, useMemo, useState } from "react";
import { MAX_BOX } from "@/domain/progress";
import { isEnCardDue, reviewEnCard, useEnProgress } from "./progress";
import { WordDrill } from "@/features/speaking/WordDrill";
import { Say, speakEnglish } from "./speech";

export type Card = { id: string; headword: string; pos: string; ipa: string | null; meaning: string; example: { text: string; vi: string } | null; lesson: number };

export function EnFlashcards({ cards, lessons }: { cards: Card[]; lessons: Array<{ number: number; title: string }> }) {
  const [progress, update, hydrated] = useEnProgress();
  const [scope, setScope] = useState<number | "studied" | null>(null);
  const [reverse, setReverse] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState<string[] | null>(null);
  const [done, setDone] = useState({ ok: 0, again: 0 });
  /** the word is covered while the learner writes it (WordDrill) */
  const [hideWord, setHideWord] = useState(false);

  // ?lesson=N from the lesson page; otherwise the lessons already opened (or lesson 1)
  useEffect(() => {
    if (!hydrated || scope !== null) return;
    const q = Number(new URLSearchParams(window.location.search).get("lesson"));
    const studied = lessons.filter((l) => Object.keys(progress.steps).some((s) => s.startsWith(`buoi-${String(l.number).padStart(2, "0")}-`)));
    setScope(q ? q : studied.length ? "studied" : 1);
  }, [hydrated, scope, lessons, progress.steps]);

  const studiedNumbers = useMemo(
    () => new Set(lessons.filter((l) => Object.keys(progress.steps).some((s) => s.startsWith(`buoi-${String(l.number).padStart(2, "0")}-`))).map((l) => l.number)),
    [lessons, progress.steps],
  );
  const inScope = cards.filter((c) => (scope === "studied" ? studiedNumbers.has(c.lesson) : c.lesson === scope));
  const due = inScope.filter((c) => isEnCardDue(progress, c.id));

  const start = () => {
    setSession(due.map((c) => c.id));
    setDone({ ok: 0, again: 0 });
    setFlipped(false);
  };
  useEffect(() => setSession(null), [scope]);

  const current = session?.length ? cards.find((c) => c.id === session[0]) : undefined;
  const answer = (remembered: boolean) => {
    if (!current) return;
    update(reviewEnCard(current.id, remembered));
    setDone((d) => (remembered ? { ...d, ok: d.ok + 1 } : { ...d, again: d.again + 1 }));
    // forgotten cards come back at the end of this session
    setSession((s) => (s ? (remembered ? s.slice(1) : [...s.slice(1), s[0]!]) : s));
    setFlipped(false);
  };
  useEffect(() => {
    if (current && !reverse && !flipped && !hideWord) speakEnglish(current.headword, 0.9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, reverse, flipped]);

  const boxes = Array.from({ length: MAX_BOX }, (_, i) => inScope.filter((c) => (progress.cards[c.id]?.box ?? 0) === i + 1).length);
  const fresh = inScope.filter((c) => !progress.cards[c.id]).length;
  const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${on ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"}`;

  if (!hydrated || scope === null) return <p className="text-stone-500">Đang tải…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={String(scope)}
          onChange={(e) => setScope(e.target.value === "studied" ? "studied" : Number(e.target.value))}
          className="w-full max-w-full rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-inset ring-stone-300 sm:w-auto"
        >
          <option value="studied" disabled={studiedNumbers.size === 0}>Các buổi đã học ({studiedNumbers.size})</option>
          {lessons.map((l) => (
            <option key={l.number} value={l.number}>Buổi {l.number}: {l.title}</option>
          ))}
        </select>
        <button type="button" className={chip(!reverse)} onClick={() => setReverse(false)}>Anh → Việt</button>
        <button type="button" className={chip(reverse)} onClick={() => setReverse(true)}>Việt → Anh</button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        <div className="rounded-xl bg-white p-2 ring-1 ring-stone-200"><p className="text-lg font-bold">{fresh}</p>chưa ôn</div>
        {boxes.map((n, i) => (
          <div key={i} className="rounded-xl bg-white p-2 ring-1 ring-stone-200"><p className="text-lg font-bold">{n}</p>hộp {i + 1}</div>
        ))}
      </div>

      {!session && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-stone-700">{due.length ? `${due.length}/${inScope.length} thẻ đến hạn ôn.` : `Không còn thẻ đến hạn trong ${inScope.length} thẻ. Quay lại sau nhé!`}</p>
          {due.length > 0 && (
            <button type="button" onClick={start} className="mt-4 rounded-xl bg-sky-700 px-6 py-3 font-semibold text-white hover:bg-sky-800">
              Bắt đầu ôn {due.length} thẻ
            </button>
          )}
        </div>
      )}

      {session && !current && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xl font-bold text-jade-700">Xong lượt ôn!</p>
          <p className="mt-1 text-stone-600">Nhớ ngay: {done.ok} · phải xem lại: {done.again}</p>
          <button type="button" onClick={() => setSession(null)} className="mt-4 rounded-xl px-5 py-2.5 text-sm font-medium ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
            Về danh sách
          </button>
        </div>
      )}

      {current && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Còn {session!.length} thẻ · Buổi {current.lesson}</p>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm"
          >
            {hideWord ? (
              <span className="text-4xl font-bold tracking-widest text-stone-300">{current.headword.replace(/S/g, "•")}</span>
            ) : !reverse || flipped ? (
              <>
                <span lang="en" className="text-4xl font-bold text-stone-900">{current.headword}</span>
                {current.ipa && <span className="mt-2 font-mono text-stone-500">{current.ipa}</span>}
              </>
            ) : null}
            {(reverse || flipped) && <span className={`${!reverse || flipped ? "mt-4 text-xl" : "text-3xl font-semibold"} text-stone-800`}>{current.meaning}</span>}
            {flipped && !hideWord && current.example && (
              <span className="mt-4 text-sm text-stone-500">
                <span lang="en" className="text-stone-700">{current.example.text}</span>
                <br />
                {current.example.vi}
              </span>
            )}
            {!flipped && <span className="mt-6 text-xs text-stone-400">Bấm vào thẻ để lật</span>}
          </button>
          <div className="flex items-center justify-center gap-3">
            <Say text={current.headword} slow />
            {flipped && (
              <>
                <button type="button" onClick={() => answer(false)} className="rounded-xl bg-red-50 px-5 py-3 font-semibold text-red-800 ring-1 ring-inset ring-red-200 hover:bg-red-100">
                  Chưa nhớ
                </button>
                <button type="button" onClick={() => answer(true)} className="rounded-xl bg-jade-600 px-5 py-3 font-semibold text-white hover:bg-jade-700">
                  Nhớ rồi
                </button>
              </>
            )}
          </div>
          <WordDrill lang="en" word={current.headword} meaning={current.meaning} onHideWord={setHideWord} play={() => speakEnglish(current.headword, 0.9)} />
        </div>
      )}
    </div>
  );
}
