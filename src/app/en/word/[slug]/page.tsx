import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/Badge";
import { enContent, enSentencesFor, enWordBySlug } from "@/content/en";
import { EnSentenceRow, Ipa, posVi } from "@/features/en/Cards";
import { Say } from "@/features/en/speech";

export const dynamicParams = false;
export const generateStaticParams = () => Object.values(enContent().words).map((w) => ({ slug: w.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const w = enWordBySlug((await params).slug);
  return { title: w ? `${w.headword} — ${w.meaning_vi[0]}` : "Từ vựng" };
}

const FORM_VI: Record<string, string> = {
  plural: "Số nhiều", past: "Quá khứ", pp: "Phân từ II", ing: "V-ing", "3sg": "Ngôi 3 số ít", comparative: "So sánh hơn", superlative: "So sánh nhất",
};

export default async function EnWordPage({ params }: { params: Promise<{ slug: string }> }) {
  const word = enWordBySlug((await params).slug);
  if (!word) notFound();
  const lesson = enContent().lessons.find((l) => l.number === word.lesson);
  const sentences = enSentencesFor(word.id);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-stone-500">
        <Link href="/en/words" className="hover:text-sky-800">Kho từ vựng</Link>
        {lesson && (
          <>
            {" · "}
            <Link href={`/en/lesson/${lesson.slug}`} className="hover:text-sky-800">Buổi {lesson.number}: {lesson.title_vi}</Link>
          </>
        )}
      </nav>
      <header className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 lang="en" className="text-4xl font-bold text-stone-900">{word.headword}</h1>
          <Say text={word.headword} slow />
          <span className="text-stone-400">{posVi(word.pos)}</span>
          {word.cefr && <Badge tone="jade">{word.cefr}</Badge>}
          {word.status === "draft" && <Badge tone="amber">Bản nháp</Badge>}
        </div>
        <div className="mt-2"><Ipa word={word} /></div>
        {word.stress && <p className="mt-1 text-sm text-stone-500">Trọng âm: <strong>{word.stress}</strong></p>}
        <p className="mt-4 text-xl text-stone-800">{word.meaning_vi.join("; ")}</p>
        {word.definition_en && <p lang="en" className="mt-1 text-stone-500 italic">{word.definition_en}</p>}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {word.forms && Object.keys(word.forms).length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold text-stone-900">Dạng từ</h2>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {Object.entries(word.forms).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-stone-500">{FORM_VI[k] ?? k}</dt>
                  <dd lang="en" className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {word.collocations && word.collocations.length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold text-stone-900">Cụm từ hay đi kèm</h2>
            <ul className="mt-2 flex flex-wrap gap-2" lang="en">
              {word.collocations.map((c) => (
                <li key={c} className="inline-flex items-center gap-1 rounded-full bg-sky-50 py-0.5 pl-3 pr-0.5 text-sm text-sky-900">
                  {c} <Say text={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {word.notes_vi && word.notes_vi.length > 0 && (
        <section className="rounded-2xl bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Lưu ý cho người Việt</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
            {word.notes_vi.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      )}

      {sentences.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-stone-900">Câu ví dụ</h2>
          <ul className="space-y-3">
            {sentences.map((s) => <EnSentenceRow key={s.id} sentence={s} heads={[word.headword]} />)}
          </ul>
        </section>
      )}
      <p className="text-xs text-stone-400">{word.cefr ? "Cấp CEFR theo Oxford 3000/5000. " : "Từ này không có trong danh sách Oxford 3000/5000. "}{word.provenance?.some((p) => p.field.startsWith("ipa.") && p.source !== "ai-draft") ? "IPA đã đối chiếu từ điển." : "IPA chưa đối chiếu từ điển."}</p>
    </div>
  );
}
