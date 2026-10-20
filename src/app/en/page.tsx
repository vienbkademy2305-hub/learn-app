import Link from "next/link";
import { enContent, enLessonSteps, enStep } from "@/content/en";
import { enTestCards } from "@/content/en-tests";
import { EnSyncNote } from "@/features/en/EnSync";
import { EnVoicePicker } from "@/features/en/EnVoicePicker";
import { TestList } from "@/features/en/TestRunner";
import { EN_STAGES, groupIntoStages } from "@/content/stages";
import { StageMap, type MapStage } from "@/features/stages/StageMap";

export default function EnglishHomePage() {
  const { lessons, words, sentences } = enContent();
  const mapStages: MapStage[] = groupIntoStages(EN_STAGES, lessons).map(({ def, lessons: ls }, i) => ({
    id: def.id,
    title: def.title,
    icon: def.icon,
    blurb: def.blurb,
    tag: `Chặng ${i + 1}`,
    group: `Giai đoạn ${ls[0]?.stage ?? ""}`,
    tests: enTestCards()
      .filter((t) => t.after >= def.from && t.after <= def.to)
      .map((t) => ({
        id: t.id,
        href: `/en/kiem-tra/${t.id}`,
        title: t.title,
        meta: `${t.kind === "final" ? "Bài đầu ra" : `Sau buổi ${t.after}`} · ${t.minutes} phút · ${t.items} câu · đạt từ ${t.pass}%`,
        kind: t.kind,
        after: t.after,
        trackEn: true,
      })),
    items: ls.map((l) => ({
      slug: l.slug,
      href: `/en/lesson/${l.slug}`,
      number: l.number,
      label: `Buổi ${l.number}`,
      title: l.title_vi,
      sub: [l.focus?.skill, l.focus?.grammar].filter(Boolean).join(" · ") || undefined,
      steps: enLessonSteps(l).length,
      exercises: (enStep(l, "exercises")?.items ?? []).map((x) => x.id),
    })),
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

      <section>
        <h2 className="mb-1 text-xl font-bold text-stone-900">Bản đồ lộ trình</h2>
        <p className="mb-4 text-sm text-stone-500">Chạm vào một chặng để xem các buổi học của chặng đó.</p>
        <StageMap lang="en" stages={mapStages} />
      </section>

      <p className="text-sm text-stone-600">
        Bài kiểm tra nằm ngay trong từng chặng (biểu tượng 📝). <Link href="/en/kiem-tra" className="font-medium text-sky-800 hover:underline">Xem tất cả bài kiểm tra →</Link>
      </p>

      <p className="text-xs text-stone-400">
        Nội dung là <strong>bản nháp</strong> do Claude biên soạn, đang chờ duyệt. Cấp CEFR theo danh sách Oxford 3000/5000; phần lớn IPA đã đối chiếu Oxford Learner’s và Wiktionary. <EnSyncNote />
      </p>
    </div>
  );
}
