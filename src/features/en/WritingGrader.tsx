"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/features/account/account";
import { CRITERIA_VI, locateErrors, PERSONAL_ERRORS, STRENGTH_TYPES, STRENGTH_VI, type GradeResult } from "../../../supabase/functions/grade-writing/grader";
import { gradeHomework, loadGrades, type GradeRequest, type WritingGrade } from "./grader";

const MIN_WORDS = 10;

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * "Chấm bài" under the homework box — one AI call, shown in tabs: bands + comments, errors highlighted in the text,
 * sentence upgrades + corrected text, how to reach the next band, strengths, a sample answer. History of this lesson.
 */
export function WritingGrader({ request, words }: { request: GradeRequest; words: number }) {
  const account = useAccount();
  const signedIn = account.status === "signed-in";
  const [grades, setGrades] = useState<WritingGrade[]>([]);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return setGrades([]);
    let live = true;
    void loadGrades(request.slug).then((g) => live && setGrades(g));
    return () => {
      live = false;
    };
  }, [signedIn, request.slug]);

  if (account.status === "disabled" || account.status === "loading") return null;

  async function run() {
    setBusy(true);
    setError(null);
    const r = await gradeHomework(request);
    setBusy(false);
    if ("error" in r) return setError(r.error);
    setGrades((g) => [r.grade, ...g]);
    setShown(0);
  }

  const current = grades[shown];
  const changed = current && current.text.trim() !== request.text.trim();

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Chấm bài tự động</h2>
          <p className="text-sm text-stone-500">Band ước lượng theo 4 tiêu chí IELTS, tìm lỗi, sửa bài, nâng band — do AI chấm, không thay giám khảo thật.</p>
        </div>
        {signedIn ? (
          <button
            type="button"
            disabled={busy || words < MIN_WORDS}
            onClick={run}
            className="rounded-xl bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-800 disabled:bg-stone-300"
          >
            {busy ? "Đang chấm…" : grades.length ? "Chấm lại" : "Chấm bài"}
          </button>
        ) : (
          <span className="text-sm text-stone-500">Đăng nhập để chấm bài.</span>
        )}
      </div>
      {busy && <p className="text-sm text-stone-500">AI đang đọc bài, thường mất 20–60 giây…</p>}
      {signedIn && !busy && words < MIN_WORDS && !grades.length && <p className="text-sm text-stone-500">Viết ít nhất {MIN_WORDS} từ để chấm.</p>}
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {grades.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {grades.map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setShown(i)}
              className={`rounded-lg border px-2 py-1 ${i === shown ? "border-sky-600 bg-sky-50 text-sky-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
            >
              {when(g.created_at)} · {g.result.overall.toFixed(1)}
            </button>
          ))}
        </div>
      )}

      {current && (
        <>
          {changed && <p className="text-xs text-amber-700">Kết quả dưới đây là của bản bài lúc {when(current.created_at)}; bài đã sửa sau đó.</p>}
          <GradeView key={current.id} result={current.result} text={current.text} />
          <p className="text-xs text-stone-400">
            Chấm lúc {when(current.created_at)} · {current.model}
          </p>
        </>
      )}
    </section>
  );
}

const TABS = [
  { id: "score", label: "Chấm bài" },
  { id: "errors", label: "Tìm lỗi" },
  { id: "fix", label: "Sửa bài" },
  { id: "up", label: "Nâng band" },
  { id: "good", label: "Ưu điểm" },
  { id: "sample", label: "Bài mẫu" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const box = "rounded-xl border border-stone-200 p-3";

function GradeView({ result, text }: { result: GradeResult; text: string }) {
  const [tab, setTab] = useState<Tab>("score");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl bg-sky-700 p-3 text-center text-white">
          <div className="text-xs opacity-80">Band tổng</div>
          <div className="text-3xl font-bold">{result.overall.toFixed(1)}</div>
        </div>
        {result.criteria.map((c) => (
          <div key={c.code} className={`${box} text-center`}>
            <div className="text-xs text-stone-500">{CRITERIA_VI[c.code]}</div>
            <div className="text-2xl font-bold text-stone-900">{c.band.toFixed(1)}</div>
          </div>
        ))}
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.id ? "border-sky-700 text-sky-800" : "border-transparent text-stone-500 hover:text-stone-800"}`}
          >
            {t.label}
            {t.id === "errors" && result.errors.length > 0 && <span className="ml-1 rounded-full bg-rose-100 px-1.5 text-xs text-rose-800">{result.errors.length}</span>}
          </button>
        ))}
      </div>

      {tab === "score" && <ScoreTab result={result} />}
      {tab === "errors" && <ErrorsTab result={result} text={text} />}
      {tab === "fix" && <FixTab result={result} />}
      {tab === "up" && <UpTab result={result} />}
      {tab === "good" && <GoodTab result={result} />}
      {tab === "sample" && (
        <div className="space-y-2">
          <p className="text-sm text-stone-500">Bài mẫu do AI viết cho cùng đề, ở mức khoảng band {result.next_band.target.toFixed(1)} — mục tiêu kế tiếp của bạn.</p>
          <p lang="en" className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 leading-relaxed text-stone-800">
            {result.sample || "—"}
          </p>
        </div>
      )}
    </div>
  );
}

/** A learner quote shown as evidence. */
const Quote = ({ text, tone }: { text: string; tone: "good" | "bad" | "plain" }) =>
  text ? (
    <span
      lang="en"
      className={`mt-0.5 block rounded px-1.5 py-0.5 text-sm italic ${tone === "good" ? "bg-jade-50 text-jade-700" : tone === "bad" ? "bg-rose-50 text-rose-800" : "bg-stone-100 text-stone-700"}`}
    >
      “{text}”
    </span>
  ) : null;

function ScoreTab({ result }: { result: GradeResult }) {
  const checklist = result.checklist ?? [];
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-sky-50 p-3 text-stone-800">{result.summary_vi}</p>

      {checklist.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-stone-900">
            Đề bài yêu cầu — đã đáp ứng {checklist.filter((c) => c.done).length}/{checklist.length}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((c, i) => (
              <li key={i} className={`flex gap-2 rounded-xl border p-2.5 text-sm ${c.done ? "border-jade-100 bg-jade-50/50" : "border-rose-200 bg-rose-50/60"}`}>
                <span className={`font-bold ${c.done ? "text-jade-600" : "text-rose-700"}`}>{c.done ? "✓" : "✗"}</span>
                <span>
                  <span className="font-medium text-stone-900">{c.point_vi}</span>
                  {c.note_vi && <span className="block text-stone-600">{c.note_vi}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-stone-900">Nhận xét theo từng tiêu chí</h3>
        {result.criteria.map((c) => (
          <CriterionCard key={c.code} c={c} />
        ))}
      </div>

      {result.weakest_vi && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-stone-800">
          <span className="font-semibold text-amber-900">Điểm nghẽn: </span>
          {result.weakest_vi}
        </p>
      )}
      {result.actions_vi.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-900">Cần cải thiện ở bài sau</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-stone-800">
            {result.actions_vi.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function CriterionCard({ c }: { c: GradeResult["criteria"][number] }) {
  const good = c.good ?? [];
  const bad = c.bad ?? [];
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200">
      <div className="flex items-center gap-3 border-b border-stone-100 bg-stone-50 px-3 py-2">
        <span className="rounded-lg bg-sky-700 px-2 py-1 text-lg font-bold text-white">{c.band.toFixed(1)}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-stone-900">{CRITERIA_VI[c.code]}</div>
          <div className="mt-1 h-1.5 rounded-full bg-stone-200" aria-hidden>
            <div className="h-1.5 rounded-full bg-sky-600" style={{ width: `${(c.band / 9) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <p className="text-stone-800">{c.comment_vi}</p>
        {c.descriptor_vi && (
          <p className="rounded-lg bg-stone-100 p-2.5 text-sm text-stone-700">
            <span className="font-semibold">Band {c.band.toFixed(1)} nghĩa là: </span>
            {c.descriptor_vi}
          </p>
        )}
        {(good.length > 0 || bad.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-jade-700">✓ Làm được</h4>
              <ul className="space-y-2 text-sm text-stone-800">
                {good.map((p, i) => (
                  <li key={i}>
                    {p.point_vi}
                    <Quote text={p.quote} tone="good" />
                  </li>
                ))}
                {!good.length && <li className="text-stone-500">—</li>}
              </ul>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-semibold text-rose-700">✗ Chưa được</h4>
              <ul className="space-y-2 text-sm text-stone-800">
                {bad.map((p, i) => (
                  <li key={i}>
                    {p.point_vi}
                    <Quote text={p.quote} tone="bad" />
                  </li>
                ))}
                {!bad.length && <li className="text-stone-500">—</li>}
              </ul>
            </div>
          </div>
        )}
        {c.next_vi && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-sm text-stone-800">
            <span className="font-semibold text-sky-800">→ Để lên band {Math.min(9, c.band + 0.5).toFixed(1)}: </span>
            {c.next_vi}
          </p>
        )}
      </div>
    </div>
  );
}

/** The graded text with every located error highlighted and numbered like the table below it. */
function Highlighted({ text, result }: { text: string; result: GradeResult }) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const s of locateErrors(text, result.errors)) {
    if (s.start > at) parts.push(text.slice(at, s.start));
    const e = result.errors[s.index]!;
    parts.push(
      <mark key={s.start} title={`→ ${e.right} · ${e.why_vi}`} className="rounded bg-rose-100 px-0.5 text-rose-900 underline decoration-rose-400 decoration-wavy">
        {text.slice(s.start, s.end)}
        <sup className="ml-0.5 text-[10px] font-bold text-rose-700">{s.index + 1}</sup>
      </mark>,
    );
    at = s.end;
  }
  parts.push(text.slice(at));
  return (
    <p lang="en" className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 leading-loose text-stone-800">
      {parts}
    </p>
  );
}

function ErrorsTab({ result, text }: { result: GradeResult; text: string }) {
  if (!result.errors.length) return <p className="text-stone-700">Không tìm thấy lỗi đáng kể. 🎉</p>;
  return (
    <div className="space-y-4">
      <Highlighted text={text} result={result} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-stone-500">
            <tr className="border-b border-stone-200">
              <th className="py-1 pr-2 font-medium">#</th>
              <th className="py-1 pr-3 font-medium">Lỗi sai</th>
              <th className="py-1 pr-3 font-medium">Sửa</th>
              <th className="py-1 font-medium">Giải thích</th>
            </tr>
          </thead>
          <tbody>
            {result.errors.map((e, i) => (
              <tr key={i} className="border-b border-stone-100 align-top">
                <td className="py-2 pr-2 font-bold text-rose-700">{i + 1}</td>
                <td lang="en" className="py-2 pr-3 text-rose-700 line-through decoration-rose-300">
                  {e.wrong}
                </td>
                <td lang="en" className="py-2 pr-3 font-medium text-jade-700">
                  {e.right}
                </td>
                <td className="py-2 text-stone-700">
                  {e.why_vi}
                  {(e.personal || e.lesson) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {e.personal && <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">Lỗi quen: {PERSONAL_ERRORS[e.personal]}</span>}
                      {e.lesson && <span className="rounded bg-stone-100 px-1.5 text-xs text-stone-600">Buổi {e.lesson}</span>}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FixTab({ result }: { result: GradeResult }) {
  return (
    <div className="space-y-4">
      {result.upgrades.map((u, i) => (
        <div key={i} className={`${box} space-y-2`}>
          <p className="text-sm">
            <span className="font-semibold text-stone-500">Câu gốc: </span>
            <span lang="en" className="text-stone-700">{u.original}</span>
          </p>
          <p className="text-sm">
            <span className="font-semibold text-jade-700">Câu tốt hơn: </span>
            <span lang="en" className="font-medium text-stone-900">{u.better}</span>
          </p>
          {u.changes.length > 0 && (
            <ul className="space-y-1 text-sm">
              {u.changes.map((c, j) => (
                <li key={j}>
                  <code lang="en" className="rounded bg-stone-100 px-1">{c.from}</code> →{" "}
                  <code lang="en" className="rounded bg-jade-50 px-1 text-jade-700">{c.to}</code>
                  <span className="text-stone-600"> — {c.why_vi}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div>
        <h3 className="mb-1 font-semibold text-stone-900">Bản sửa hoàn chỉnh (giữ ý của bạn)</h3>
        <p lang="en" className="whitespace-pre-wrap rounded-xl bg-stone-50 p-3 leading-relaxed text-stone-800">
          {result.corrected}
        </p>
      </div>
    </div>
  );
}

function UpTab({ result }: { result: GradeResult }) {
  const next = result.next_band;
  const steps = next.steps ?? [];
  const structures = next.structures ?? [];
  // results saved before steps existed only have a list of sentences
  const legacy = (next as { changes_vi?: string[] }).changes_vi ?? [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-sky-700 p-4 text-white">
        <div className="text-center">
          <div className="text-xs opacity-80">Hiện tại</div>
          <div className="text-3xl font-bold">{result.overall.toFixed(1)}</div>
        </div>
        <div className="text-2xl opacity-80">→</div>
        <div className="text-center">
          <div className="text-xs opacity-80">Mục tiêu</div>
          <div className="text-3xl font-bold">{next.target.toFixed(1)}</div>
        </div>
        <p className="min-w-0 flex-1 text-sm opacity-90">
          Làm lần lượt các bước dưới đây trong bài viết tới — ưu tiên từ trên xuống (tiêu chí đang thấp nhất trước).
        </p>
      </div>

      {(steps.length > 0 || legacy.length > 0) && (
        <div>
          <h3 className="mb-2 font-semibold text-stone-900">Lộ trình từng bước</h3>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-stone-200 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-stone-900">
                    {s.criterion && <span className="mr-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-800">{CRITERIA_VI[s.criterion]}</span>}
                    {s.action_vi}
                  </p>
                  {(s.before || s.after) && (
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {s.before && (
                        <div>
                          <div className="text-xs font-semibold text-rose-700">Bài bạn viết</div>
                          <Quote text={s.before} tone="bad" />
                        </div>
                      )}
                      {s.after && (
                        <div>
                          <div className="text-xs font-semibold text-jade-700">{s.before ? "Nên viết" : "Thêm vào"}</div>
                          <Quote text={s.after} tone="good" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {legacy.map((c, i) => (
              <li key={`l${i}`} className={`${box} text-stone-800`}>
                {i + 1}. {c}
              </li>
            ))}
          </ol>
        </div>
      )}

      {structures.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-stone-900">Cấu trúc câu nên bắt đầu dùng</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {structures.map((s, i) => (
              <li key={i} className={box}>
                <code lang="en" className="font-semibold text-sky-800">{s.structure}</code>
                <p className="mt-1 text-sm text-stone-700">{s.use_vi}</p>
                <Quote text={s.example} tone="plain" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.vocabulary.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-stone-900">Từ vựng nâng band</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.vocabulary.map((v, i) => (
              <li key={i} className={box}>
                <span lang="en" className="font-semibold text-sky-800">{v.phrase}</span>
                <span className="text-stone-600"> — {v.meaning_vi}</span>
                {v.replaces && (
                  <p className="mt-1 text-xs text-stone-500">
                    Thay cho: <span lang="en" className="text-rose-700 line-through decoration-rose-300">{v.replaces}</span>
                  </p>
                )}
                {v.example && (
                  <p lang="en" className="mt-1 text-sm text-stone-500 italic">
                    {v.example}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GoodTab({ result }: { result: GradeResult }) {
  const strengths = result.strengths;
  if (!strengths.length) return <p className="text-stone-700">Chưa có điểm nổi bật — xem tab Nâng band để biết nên thêm gì.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {STRENGTH_TYPES.map((t) => (
          <span key={t} className="rounded-lg bg-jade-50 px-2 py-1 text-jade-700">
            {STRENGTH_VI[t]}: <b>{strengths.filter((s) => s.type === t).length}</b>
          </span>
        ))}
      </div>
      <ul className="space-y-2">
        {strengths.map((s, i) => (
          <li key={i} className={box}>
            <span className="mr-2 rounded bg-jade-50 px-1.5 text-xs text-jade-700">{STRENGTH_VI[s.type]}</span>
            {s.quote && <span lang="en" className="font-medium text-stone-900">“{s.quote}”</span>}
            <p className="mt-1 text-sm text-stone-600">{s.note_vi}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
