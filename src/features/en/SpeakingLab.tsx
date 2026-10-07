"use client";
import { useEffect, useMemo, useState } from "react";
import { PronounceCheck } from "./PronounceCheck";
import { Say } from "./speech";
import { DEFAULT_PRONOUNCE_URL, getPronounceUrl, pronounceHealth, setPronounceUrl } from "./pronounce";

export type LabSentence = { lesson: number; text: string; vi: string };

export function ServerStatus() {
  const [url, setUrl] = useState(DEFAULT_PRONOUNCE_URL);
  const [ok, setOk] = useState<boolean | null>(null);
  const check = async (u = getPronounceUrl()) => {
    setOk(null);
    setOk(await pronounceHealth(u));
  };
  useEffect(() => {
    setUrl(getPronounceUrl());
    void check();
  }, []);

  return (
    <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-stone-900">Máy chấm phát âm</h2>
        {ok === null && <span className="text-sm text-stone-500">Đang kiểm tra…</span>}
        {ok === true && <span className="rounded-full bg-jade-100 px-2.5 py-0.5 text-sm font-medium text-jade-700">● Đang chạy</span>}
        {ok === false && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800">● Chưa kết nối</span>}
        <button type="button" onClick={() => void check()} className="text-sm text-sky-800 hover:underline">Kiểm tra lại</button>
      </div>
      {ok === false && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Trên máy tính, mở thư mục <code className="rounded bg-stone-100 px-1">D:\Lean - Ngoại ngữ\OpenPronounce</code> và chạy{" "}
            <strong>Chạy chấm phát âm.bat</strong>. Để cửa sổ đen đó mở trong lúc luyện.
          </li>
          <li>Đợi dòng <code className="rounded bg-stone-100 px-1">Uvicorn running on http://127.0.0.1:8765</code> rồi bấm “Kiểm tra lại”.</li>
          <li>Nếu Chrome hỏi “cho phép trang truy cập thiết bị trong mạng cục bộ”, chọn <strong>Cho phép</strong>.</li>
        </ol>
      )}
      <details className="text-sm text-stone-600">
        <summary className="cursor-pointer">Địa chỉ máy chấm (dùng khi luyện trên điện thoại qua Tailscale)</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setPronounceUrl(url);
              setUrl(getPronounceUrl());
              void check();
            }}
            className="rounded-lg bg-sky-700 px-3 py-1.5 font-medium text-white hover:bg-sky-800"
          >
            Lưu
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Mặc định {DEFAULT_PRONOUNCE_URL}. Bản ghi âm chỉ gửi tới máy chấm này, không lưu ở đâu khác.</p>
      </details>
    </section>
  );
}

export function SpeakingLab({ sentences }: { sentences: LabSentence[] }) {
  const lessons = useMemo(() => [...new Set(sentences.map((s) => s.lesson))], [sentences]);
  const [lesson, setLesson] = useState(lessons[0] ?? 1);
  const pool = useMemo(() => sentences.filter((s) => s.lesson === lesson), [sentences, lesson]);
  const [index, setIndex] = useState(0);
  const [own, setOwn] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const current = pool[index % Math.max(pool.length, 1)];

  return (
    <div className="space-y-6">
      <ServerStatus />

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-stone-900">Câu trong bài học</h2>
          <select
            value={lesson}
            onChange={(e) => {
              setLesson(Number(e.target.value));
              setIndex(0);
            }}
            className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
          >
            {lessons.map((n) => <option key={n} value={n}>Buổi {n}</option>)}
          </select>
          {pool.length > 0 && <span className="text-sm text-stone-500">Câu {(index % pool.length) + 1}/{pool.length}</span>}
        </div>
        {current ? (
          <>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p lang="en" className="text-xl text-stone-900">{current.text}</p>
                <p className="mt-1 text-stone-500">{current.vi}</p>
              </div>
              <Say text={current.text} slow />
            </div>
            <PronounceCheck text={current.text} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIndex((i) => (i - 1 + pool.length) % pool.length)} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">← Câu trước</button>
              <button type="button" onClick={() => setIndex((i) => (i + 1) % pool.length)} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">Câu sau →</button>
              <button type="button" onClick={() => setIndex(Math.floor(Math.random() * pool.length))} className="rounded-xl px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-50">🎲 Ngẫu nhiên</button>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-500">Buổi này không có câu ví dụ.</p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-stone-900">Câu của bạn</h2>
        <p className="text-sm text-stone-500">Gõ câu bạn muốn luyện (ví dụ câu trả lời Speaking của bạn), bấm “Dùng câu này”, rồi đọc to đúng câu đó.</p>
        <textarea
          lang="en"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder="I usually take the bus to work because it's cheaper than driving."
          className="w-full rounded-xl border border-stone-300 p-3 text-base focus:border-sky-500 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!own.trim()}
            onClick={() => setTarget(own.trim().replace(/\s+/g, " "))}
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            Dùng câu này
          </button>
          {target && <Say text={target} slow label="Nghe mẫu" />}
        </div>
        {target && <PronounceCheck text={target} />}
      </section>
    </div>
  );
}
