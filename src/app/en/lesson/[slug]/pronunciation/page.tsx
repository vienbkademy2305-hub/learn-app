import type { Metadata } from "next";
import { enContent, enLesson, enLessons, enStep, enStepNeighbors, enWord } from "@/content/en";
import { EnSoundCard, Ipa } from "@/features/en/Cards";
import { Say } from "@/features/en/speech";
import { StepFooter } from "@/features/lesson/StepFooter";

export const dynamicParams = false;
export const generateStaticParams = () => enLessons().map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const lesson = enLesson((await params).slug);
  return { title: lesson ? `Phát âm · Buổi ${lesson.number}` : "Phát âm" };
}

/** Step 2 — the sounds and stress patterns that are easy to get wrong in this lesson's words. */
export default async function EnPronunciationPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = enLesson((await params).slug)!;
  const notes = enStep(lesson, "pronunciation")?.notes ?? [];
  const { sounds } = enContent();
  const { back, next } = enStepNeighbors(lesson, "pronunciation");
  return (
    <div className="space-y-4">
      {notes.map((n, i) => {
        const sound = n.sound ? sounds[n.sound] : undefined;
        if (sound) return <EnSoundCard key={i} sound={sound} note={n.text_vi} />;
        const word = n.word ? enWord(n.word) : undefined;
        return (
          <article key={i} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            {word && (
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span lang="en" className="text-xl font-bold text-stone-900">{word.headword}</span>
                <Ipa word={word} />
                <Say text={word.headword} slow />
              </div>
            )}
            <p className="text-stone-700">{n.text_vi}</p>
          </article>
        );
      })}
      <StepFooter back={back} next={next} />
    </div>
  );
}
