import Link from "next/link";
import { content, getLevels, lessonsOfLevel } from "@/content/load";
import { ZhVoicePicker } from "@/features/audio/ZhVoicePicker";
import { groupIntoStages, ZH_PINYIN_STAGE, ZH_STAGES } from "@/content/stages";
import { zhTestCards } from "@/content/zh-tests";
import { lessonLabel } from "@/content/lesson-label";
import { StageMap, type MapStage } from "@/features/stages/StageMap";

export default function HomePage() {
  const { words, sentences } = content();
  const all = getLevels().flatMap((l) => lessonsOfLevel(l));
  let n = 0;
  const zhTests = zhTestCards();
  const mapStages: MapStage[] = [
    {
      id: ZH_PINYIN_STAGE.id,
      title: ZH_PINYIN_STAGE.title,
      icon: ZH_PINYIN_STAGE.icon,
      blurb: ZH_PINYIN_STAGE.blurb,
      tag: "Khởi động",
      group: "HSK 1",
      items: [{ slug: "pinyin", href: "/zh/pinyin", label: "Bài 0", title: "Nhập môn phát âm & pinyin", untracked: true }],
    },
    ...groupIntoStages(ZH_STAGES, all).map(({ def, lessons: ls }) => ({
      id: def.id,
      title: def.title,
      icon: def.icon,
      blurb: def.blurb,
      tag: `Chặng ${++n}`,
      group: `HSK ${def.level}`,
      // the practice tests of a level sit in its last stage
      tests: ZH_STAGES.filter((d) => d.level === def.level).at(-1)?.id === def.id
        ? zhTests
            .filter((t) => String(t.level) === def.level)
            .map((t) => ({ id: t.id, href: `/zh/kiem-tra/${t.id}`, title: t.title, meta: `${t.minutes} phút · ${t.items} câu · đạt từ ${t.pass}%`, kind: "exam" as const }))
        : [],
      items: ls.map((l) => ({
        slug: l.slug,
        href: `/zh/lesson/${l.slug}`,
        label: lessonLabel(l),
        title: l.title,
        sub: `${l.words.length} từ · ${l.sentences.length} câu`,
        words: l.words,
      })),
    })),
  ];
  const levels = getLevels();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-10 text-white shadow-md sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-100">Tiếng Trung cho người Việt</p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">Học HSK1–HSK2 từng bước, giải thích bằng tiếng Việt</h1>
        <p className="mt-4 max-w-xl text-brand-50">
          Mỗi từ có chữ Hán, pinyin, âm Hán Việt, nghĩa tiếng Việt và câu ví dụ có audio thường và chậm.
        </p>
        <p lang="zh-CN" className="font-han mt-6 text-5xl tracking-widest text-white/90">你好！</p>
        <p className="mt-1 text-brand-100">nǐ hǎo · nhĩ hảo · Xin chào</p>
      </section>

      <ZhVoicePicker />

      <section>
        <h2 className="mb-1 text-xl font-bold text-stone-900">Bản đồ lộ trình HSK1 → HSK3</h2>
        <p className="mb-4 text-sm text-stone-500">
          {Object.values(words).filter((w) => w.inCurriculum).length} từ vựng · {Object.keys(sentences).length} câu ví dụ. Chạm vào một chặng để xem các bài học.
        </p>
        <StageMap lang="zh" stages={mapStages} />
        <p className="mt-4 text-sm text-stone-600">
          Thích xem dạng danh sách?{" "}
          {levels.map((l, i) => (
            <span key={l}>
              {i > 0 && " · "}
              <Link href={`/zh/hsk/${l}`} className="font-medium text-brand-700 hover:underline">HSK{l}</Link>
            </span>
          ))}
        </p>
      </section>

      <p className="text-xs text-stone-400">
        Tiến độ học được lưu trên trình duyệt này. Các bản dịch câu hiện là bản nháp, đang chờ biên tập.
      </p>
    </div>
  );
}
