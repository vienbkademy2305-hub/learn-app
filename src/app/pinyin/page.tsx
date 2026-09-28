import type { Metadata } from "next";
import Link from "next/link";
import { content, getLessons } from "@/content/load";
import { BASIC_STROKES, FINALS, INITIALS, PRONUNCIATION_DRAFT, SPELLING_RULES, STROKE_ORDER_RULES, TONE_SANDHI, TONE_TIPS, TONES } from "@/content/pronunciation";
import { lessonCharacters } from "@/domain/display";
import { tonePool } from "@/domain/pronunciation";
import { Badge } from "@/components/Badge";
import { ListenQuiz } from "@/features/pronunciation/ListenQuiz";
import { SoundTile, SpeakChip, VoiceNotice } from "@/features/pronunciation/SoundTile";
import { TONE_COLORS, ToneChart } from "@/features/pronunciation/ToneChart";
import { CharacterPicker } from "@/features/writing/CharacterPicker";

export const metadata: Metadata = { title: "Bài 0 · Nhập môn phát âm" };

const SECTIONS = [
  ["syllable", "1. Âm tiết"],
  ["tones", "2. Thanh điệu"],
  ["initials", "3. Thanh mẫu"],
  ["finals", "4. Vận mẫu"],
  ["spelling", "5. Quy tắc viết"],
  ["sandhi", "6. Biến điệu"],
  ["strokes", "7. Nét chữ"],
  ["practice", "8. Luyện nghe"],
  ["how", "9. Cách học"],
] as const;

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 id={`${id}-title`} className="text-xl font-bold text-stone-900">
          {title}
        </h2>
        {intro && <p className="mt-1 text-stone-600">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

const Han = ({ children }: { children: React.ReactNode }) => (
  <span lang="zh-CN" className="font-han text-[1.1em] text-stone-900">
    {children}
  </span>
);

/** Lesson 0: how to read pinyin — tones, initials, finals, spelling rules, sandhi, basic strokes, listening drills. */
export default function PinyinIntroPage() {
  const snapshot = content();
  const words = Object.values(snapshot.words);
  const pool = tonePool(words);
  const first = getLessons()[0]!;
  const strokeChars = lessonCharacters(
    [...new Set(STROKE_ORDER_RULES.map((r) => r.hanzi))].flatMap((h) => {
      const w = words.find((x) => x.chars.some((c) => c.hanzi === h));
      const c = w?.chars.find((x) => x.hanzi === h);
      return c ? [{ slug: h, chars: [c] }] : [];
    }),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
          <Link href="/hsk/1" className="hover:text-brand-700">
            HSK 1
          </Link>{" "}
          › Bài 0
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-stone-900">Bài 0 · Nhập môn phát âm</h1>
          {PRONUNCIATION_DRAFT && (
            <span title="Nội dung do AI soạn, chưa được giáo viên duyệt.">
              <Badge tone="amber">Bản nháp</Badge>
            </span>
          )}
        </div>
        <p className="text-stone-600">
          Trước khi học từ, hãy làm quen với <strong>pinyin</strong> — cách viết âm đọc tiếng Trung bằng chữ Latinh. Bấm vào từng ô để nghe chữ ví dụ, đọc theo nhiều lần.
        </p>
        <VoiceNotice />
        <nav aria-label="Các phần của bài" className="-mx-4 overflow-x-auto px-4">
          <ol className="flex w-max gap-2 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block whitespace-nowrap rounded-full bg-white px-3 py-1.5 font-medium text-stone-600 ring-1 ring-inset ring-stone-300 hover:bg-stone-100">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <Section id="syllable" title="1. Một âm tiết gồm 3 phần" intro="Mỗi chữ Hán đọc thành một âm tiết. Pinyin ghi âm tiết đó bằng 3 phần:">
        <div className="flex flex-wrap items-end justify-center gap-3 rounded-xl bg-stone-50 p-4 text-center">
          <div>
            <p className="font-han text-5xl" lang="zh-CN">好</p>
            <p className="mt-1 text-3xl font-bold">
              <span className="text-jade-700">h</span>
              <span className="text-amber-700">ǎo</span>
            </p>
          </div>
          <ul className="space-y-1 text-left text-sm">
            <li>
              <span className="font-bold text-jade-700">h</span> — <strong>thanh mẫu</strong> (phụ âm đầu)
            </li>
            <li>
              <span className="font-bold text-amber-700">ao</span> — <strong>vận mẫu</strong> (phần vần)
            </li>
            <li>
              <span className="font-bold text-brand-700">ˇ</span> — <strong>thanh điệu</strong> (dấu, thanh 3)
            </li>
          </ul>
        </div>
        <p className="text-sm text-stone-600">
          Có 21 thanh mẫu, khoảng 36 vận mẫu và 4 thanh + thanh nhẹ. Đổi thanh là đổi nghĩa: <SpeakChip text="妈" label="mā mẹ" />, <SpeakChip text="马" label="mǎ ngựa" />,{" "}
          <SpeakChip text="骂" label="mà mắng" />. Một số âm tiết không có thanh mẫu, như <Han>爱</Han> ài, <Han>我</Han> wǒ.
        </p>
      </Section>

      <Section id="tones" title="2. Bốn thanh điệu + thanh nhẹ" intro="Thanh điệu quan trọng như dấu trong tiếng Việt. So sánh với dấu tiếng Việt chỉ là gần đúng — hãy nghe và bắt chước.">
        <ToneChart />
        <ul className="grid gap-3 sm:grid-cols-2">
          {TONES.map((t) => (
            <li key={t.tone} className="rounded-xl p-3 ring-1 ring-stone-200">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: TONE_COLORS[t.tone] }}>
                  {t.mark}
                </span>
                <span className="font-semibold text-stone-900">{t.name}</span>
                <SpeakChip text={t.example.hanzi} label={`${t.example.hanzi} ${t.example.pinyin} — ${t.example.meaning}`} />
              </p>
              <p className="mt-1 text-sm text-stone-600">{t.vi}</p>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
          {TONE_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </Section>

      <Section id="initials" title="3. Thanh mẫu (phụ âm đầu)" intro="Chú ý các cặp bật hơi / không bật hơi (b–p, d–t, g–k…) và ba nhóm dễ nhầm j q x · zh ch sh · z c s.">
        {INITIALS.map((g) => (
          <div key={g.title}>
            <h3 className="font-semibold text-stone-800">{g.title}</h3>
            {g.note && <p className="text-sm text-stone-500">{g.note}</p>}
            <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <li key={it.sound}>
                  <SoundTile item={it} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="finals" title="4. Vận mẫu (phần vần)" intro="Nhiều vận mẫu viết giống tiếng Việt nhưng đọc khác — đặc biệt e, ong, ian và i sau z c s zh ch sh r.">
        {FINALS.map((g) => (
          <div key={g.title}>
            <h3 className="font-semibold text-stone-800">{g.title}</h3>
            {g.note && <p className="text-sm text-stone-500">{g.note}</p>}
            <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <li key={it.sound}>
                  <SoundTile item={it} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="spelling" title="5. Quy tắc viết pinyin" intro="Biết các quy tắc này để đọc đúng pinyin trong sách và gõ đúng khi làm bài.">
        <ol className="space-y-2">
          {SPELLING_RULES.map((r, i) => (
            <li key={r.rule} className="rounded-xl bg-stone-50 p-3 text-sm">
              <p className="text-stone-800">
                <span className="mr-1 font-bold text-brand-700">{i + 1}.</span>
                {r.rule}
              </p>
              <p className="mt-1 text-stone-500">
                Ví dụ: <Han>{r.examples}</Han>
              </p>
            </li>
          ))}
        </ol>
        <div className="rounded-xl bg-brand-50/60 p-3 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">Gõ pinyin trong app</p>
          <p className="mt-1">
            Gõ số thanh sau mỗi âm tiết: <code className="rounded bg-white px-1">ni3 hao3</code> = nǐ hǎo. Thanh nhẹ bỏ trống hoặc gõ 5. Chữ ü gõ là <code className="rounded bg-white px-1">v</code>:{" "}
            <code className="rounded bg-white px-1">nv3</code> = nǚ.
          </p>
        </div>
      </Section>

      <Section id="sandhi" title="6. Biến điệu — đọc khác cách viết" intro="Một số trường hợp thanh điệu thay đổi khi nói. Bấm để nghe cả từ.">
        <div className="grid gap-3 md:grid-cols-3">
          {TONE_SANDHI.map((s) => (
            <div key={s.title} className="rounded-xl p-3 ring-1 ring-stone-200">
              <h3 className="font-semibold text-stone-900">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.rule}</p>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400">
                    <th className="font-normal">Từ</th>
                    <th className="font-normal">Viết</th>
                    <th className="font-normal">Đọc</th>
                  </tr>
                </thead>
                <tbody>
                  {s.examples.map((e) => (
                    <tr key={e.hanzi}>
                      <td className="py-1">
                        <SpeakChip text={e.hanzi} label={e.hanzi} rate={0.6} />
                      </td>
                      <td className="text-stone-500">{e.written}</td>
                      <td className="font-semibold text-brand-700">{e.spoken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Section>

      <Section id="strokes" title="7. Nét cơ bản và thứ tự viết" intro="Chữ Hán ghép từ vài loại nét cơ bản, viết theo thứ tự cố định. Viết đúng thứ tự giúp chữ đẹp và nhớ lâu.">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BASIC_STROKES.map((s) => (
            <li key={s.name} className="rounded-xl bg-stone-50 p-3 text-sm">
              <p>
                <Han>{s.name}</Han> <span className="text-brand-700">{s.pinyin}</span>
              </p>
              <p className="text-stone-600">{s.vi}</p>
              <p className="mt-1 text-xs text-stone-500">
                có trong chữ <Han>{s.example}</Han>
              </p>
            </li>
          ))}
        </ul>
        <div>
          <h3 className="font-semibold text-stone-800">7 quy tắc thứ tự nét</h3>
          <ol className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {STROKE_ORDER_RULES.map((r, i) => (
              <li key={r.rule} className="flex items-center gap-2">
                <span className="font-bold text-brand-700">{i + 1}.</span> {r.rule}: <Han>{r.hanzi}</Han>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-sm text-stone-500">Chọn một chữ rồi bấm “Xem viết mẫu” để thấy thứ tự nét, sau đó tự viết thử.</p>
        <CharacterPicker characters={strokeChars} />
      </Section>

      <Section id="practice" title="8. Luyện nghe" intro="Nghe máy đọc một chữ rồi chọn thanh điệu hoặc pinyin đúng. Làm nhiều lượt cho tới khi nghe ra dễ dàng.">
        <ListenQuiz pool={pool} next={{ href: `/lesson/${first.slug}`, label: `Vào Bài 1: ${first.title}` }} />
      </Section>

      <Section id="how" title="9. Cách học mỗi bài trong app">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li>
            <strong>Từ vựng</strong> — mỗi từ có chữ Hán, pinyin, âm Hán Việt (giúp người Việt đoán nghĩa, VD <Han>学生</Han> = học sinh) và nghĩa.
          </li>
          <li>
            <strong>Ngữ pháp</strong> — cấu trúc câu, lỗi người Việt hay mắc.
          </li>
          <li>
            <strong>Câu ví dụ</strong> — nghe audio thường và chậm, đọc theo.
          </li>
          <li>
            <strong>Luyện viết</strong> — xem thứ tự nét và tập viết.
          </li>
          <li>
            <strong>Luyện tập</strong> — flashcard, nhớ từ, chép chữ, đặt câu, viết đoạn văn.
          </li>
          <li>
            <strong>Bài tập</strong> — nghe, viết, viết chữ có chấm điểm.
          </li>
          <li>
            <strong>Tổng kết</strong> — đánh dấu hoàn thành bài.
          </li>
        </ol>
        <Link href={`/lesson/${first.slug}`} className="inline-block rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
          Bắt đầu Bài 1: {first.title} →
        </Link>
      </Section>
    </div>
  );
}
