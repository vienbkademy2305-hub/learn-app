/** Grammar step helpers (docs/PHASE5_GRAMMAR_PLAN.md). Pure; randomness injected as in ./exercises. */
import { shuffle, type Choice, type Rng } from "./exercises";

export interface GrammarQuizQuestion {
  pointTitle: string;
  why: string;
  choices: Choice[];
}

/** "Câu nào đúng?": one question per recorded mistake, the correct and the wrong sentence in random order. */
export function buildGrammarQuiz(points: Array<{ title: string; mistakes: Array<{ wrong: string; right: string; why: string }> }>, rng: Rng): GrammarQuizQuestion[] {
  const questions = points.flatMap((p) =>
    p.mistakes.map((m) => ({
      pointTitle: p.title,
      why: m.why,
      choices: shuffle([{ text: m.right, correct: true }, { text: m.wrong, correct: false }], rng),
    })),
  );
  return shuffle(questions, rng);
}

/** Splits a structure formula into parts, marking the ones containing Chinese characters. */
export function structureParts(formula: string): Array<{ text: string; han: boolean }> {
  return formula.split(/\s*\+\s*/).map((text) => ({ text, han: /\p{Script=Han}/u.test(text) }));
}
