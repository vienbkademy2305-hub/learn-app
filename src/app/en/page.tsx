import Link from "next/link";
import { enContent, enLessonSteps, enStep } from "@/content/en";
import { enTestCards } from "@/content/en-tests";
import { EnSyncNote } from "@/features/en/EnSync";
import { EnVoicePicker } from "@/features/en/EnVoicePicker";
import { TestList } from "@/features/en/TestRunner";
import { EnLessonList } from "@/features/en/LessonChrome";

/** The four stages of lo-trinh-ielts-6.5.md. */
const STAGES: Record<number, { title: string; range: string }> = {
  1: { title: "Nền tảng", range: "Buổi 1–20 · band 4.0 → 5.0" },
  2: { title: "Phát triển 4 kỹ năng", range: "Buổi 21–45 · band 5.0 → 6.0" },
  3: { title: "Bứt phá lên 6.5", range: "Buổi 46–65 · band 6.0 → 6.5" },
  4: { title: "Luyện đề tổng hợp", range: "Buổi 66–80 · giữ vững 6.5" },
};

export default function EnglishHomePage() {
  const { lessons, words, sentences } = enContent();
  const stages = [...new Set(lessons.map((l) => l.stage))].sort((a, b) => a - b);
  const listOf = (stage: number) =>
    lessons
      .filter((l) => l.stage === stage)
      .map((l) => ({
        slug: l.slug,
        number: l.number,
        title: l.title_vi,
        focus: [l.focus?.skill, l.focus?.grammar].filter(Boolean).join(" · "),
        steps: enLessonSteps(l).length,
        exercises: (enStep(l, "exercises")?.items ?? []).map((x) => x.id),
        draft: l.status === "draft",
      }));

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 to-sky-900 px-6 py-10 text-white shadow-md sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-sky-100">Tiếng Anh cho người Việt</p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Lộ trình IELTS 6.5</h1>
        <p className="mt-4 max-w-xl text-sky-50">
          Giai đoạn 1: từ vựng theo chủ đề có IPA và giọng đọc, phát âm, ngữ pháp giải thích bằng tiếng Việt, hội thoại, bài tập chấm tự động.
          Giai đoạn 2: thêm chiến thuật từng dạng bài IELTS — Reading, Listening, Writing, Speaking.
        </p>
        <p className="mt-2 text-sm text-sky-100">
          {lessons.length} buổi · {Object.keys(words).length} từ vựng · {Object.keys(sentences).length} câu ví dụ
        </p>
        <p lang="en" className="mt-6 text-3xl font-semibold tracking-tight text-white/90">Nice to meet you!</p>
      </section>

      <EnVoicePicker />

      <Link href="/en/luyen-noi" className="flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm hover:bg-rose-100">
        <span className="text-3xl">🎤</span>
        <span>
          <span className="block font-semibold text-stone-900">Luyện nói — chấm phát âm</span>
          <span className="block text-sm text-stone-600">Đọc to một câu, máy chấm điểm và chỉ ra từ, âm bạn đọc sai.</span>
        </span>
      </Link>

      {stages.map((stage) => (
        <section key={stage} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                Giai đoạn {stage} · {STAGES[stage]?.title}
              </h2>
              <p className="mt-1 text-sm text-stone-500">{STAGES[stage]?.range}</p>
            </div>
            {stage === 1 && (
              <Link href="/en/words" className="text-sm font-medium text-sky-800 hover:underline">
                Kho từ vựng →
              </Link>
            )}
          </div>
          <div className="mt-5">
            <EnLessonList lessons={listOf(stage)} />
          </div>
          {enTestCards(stage).length > 0 && (
            <div className="mt-6 border-t border-stone-100 pt-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h3 className="font-semibold text-stone-900">Kiểm tra giai đoạn {stage}</h3>
                <Link href="/en/kiem-tra" className="text-sm font-medium text-sky-800 hover:underline">Tất cả bài kiểm tra →</Link>
              </div>
              <p className="mt-1 text-sm text-stone-500">Kiểm tra ngắn sau mỗi 5 buổi và bài đầu ra cuối giai đoạn — đạt từ 80% để đi tiếp.</p>
              <div className="mt-4">
                <TestList tests={enTestCards(stage)} />
              </div>
            </div>
          )}
        </section>
      ))}

      <p className="text-xs text-stone-400">
        Nội dung là <strong>bản nháp</strong> do Claude biên soạn, đang chờ duyệt. Cấp CEFR theo danh sách Oxford 3000/5000; phần lớn IPA đã đối chiếu Oxford Learner’s và Wiktionary. <EnSyncNote />
      </p>
    </div>
  );
}
