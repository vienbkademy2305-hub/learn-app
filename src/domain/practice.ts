/**
 * Practice step (docs/PHASE4_PRACTICE_PLAN.md): vocabulary recall questions and
 * self-check helpers for the learner's own sentences and paragraphs. Pure
 * functions; randomness is injected as in ./exercises.
 */
import { shuffle, type Choice, type ExWord, type Rng } from "./exercises";

export type RecallKind =
  | "hanzi-meaning" // see characters → pick the Vietnamese meaning
  | "meaning-hanzi" // see Vietnamese → pick the characters
  | "pinyin-hanzi" // see pinyin → pick the characters
  | "listen-hanzi" // hear the word → pick the characters
  | "listen-meaning" // hear the word → pick the Vietnamese meaning
  | "meaning-type"; // see Vietnamese → type the pinyin

export type RecallQuestion =
  | { kind: Exclude<RecallKind, "meaning-type">; word: ExWord; choices: Choice[] }
  | { kind: "meaning-type"; word: ExWord };

/** Question kinds of each practice mode, in rotation order. */
export const RECALL_MODES = {
  mixed: ["hanzi-meaning", "listen-hanzi", "meaning-hanzi", "pinyin-hanzi", "listen-meaning", "meaning-type"],
  listening: ["listen-hanzi", "listen-meaning"],
  "vi-zh": ["meaning-hanzi", "meaning-type"],
  "zh-vi": ["hanzi-meaning", "listen-meaning"],
} as const satisfies Record<string, readonly RecallKind[]>;
export type RecallMode = keyof typeof RECALL_MODES;

const LISTENING: ReadonlySet<RecallKind> = new Set(["listen-hanzi", "listen-meaning"]);

/**
 * Vocabulary recall: rotates through `kinds`, distractors from the same lesson.
 * When `count` exceeds the lesson's words, words repeat (reshuffled each pass, never twice in a row).
 * `canListen: false` drops the listening kinds (no Mandarin voice on the device).
 */
export function buildVocabRecall(
  words: ExWord[],
  rng: Rng,
  count = 20,
  kinds: readonly RecallKind[] = RECALL_MODES.mixed,
  canListen = true,
): RecallQuestion[] {
  const usable = words.filter((w) => w.meaning);
  const rotation = kinds.filter((k) => canListen || !LISTENING.has(k));
  if (usable.length < 4 || rotation.length === 0) return [];

  const order: ExWord[] = [];
  while (order.length < count) {
    let pass = shuffle(usable, rng);
    if (pass[0] === order[order.length - 1]) pass = [...pass.slice(1), pass[0]!];
    order.push(...pass);
  }

  const questions: RecallQuestion[] = [];
  for (const word of order.slice(0, count)) {
    const kind = rotation[questions.length % rotation.length]!;
    if (kind === "meaning-type") {
      questions.push({ kind, word });
      continue;
    }
    const byMeaning = kind === "hanzi-meaning" || kind === "listen-meaning";
    // Distractors must differ in what is shown as the option (meaning, or characters) and in sound.
    const key = (w: ExWord) => (byMeaning ? w.meaning! : w.simplified);
    const others = [...new Map(usable.filter((w) => key(w) !== key(word) && w.pinyin !== word.pinyin).map((w) => [key(w), w])).values()];
    const distractors = shuffle(others, rng).slice(0, 3);
    if (distractors.length < 3) continue;
    const choices = shuffle(
      [word, ...distractors].map((w) => (byMeaning ? { text: w.meaning!, correct: w === word } : { text: w.simplified, sub: kind === "meaning-hanzi" ? w.pinyin : undefined, correct: w === word })),
      rng,
    );
    questions.push({ kind, word, choices });
  }
  return questions;
}

const HAN = /\p{Script=Han}/u;
export const hanChars = (text: string) => [...text].filter((c) => HAN.test(c));

export interface SentenceCheck {
  hanCount: number;
  usesTarget: boolean;
  /** Han characters not among the words learned so far (lesson ≤ current) */
  unknown: string[];
  endsWithPunctuation: boolean;
}

/** Self-check of a sentence the learner wrote with a target word. Meaning itself cannot be graded (UNRESOLVED). */
export function checkOwnSentence(text: string, target: string, knownChars: ReadonlySet<string>): SentenceCheck {
  const t = text.trim();
  const chars = hanChars(t);
  return {
    hanCount: chars.length,
    usesTarget: t.includes(target),
    unknown: [...new Set(chars.filter((c) => !knownChars.has(c)))],
    endsWithPunctuation: /[。？！?!.]$/.test(t),
  };
}

export interface ParagraphCheck {
  hanCount: number;
  sentenceCount: number;
  /** slugs of lesson words found in the text, longest words matched first */
  usedWords: string[];
  unknown: string[];
}

export function checkParagraph(text: string, words: Array<{ slug: string; simplified: string }>, knownChars: ReadonlySet<string>): ParagraphCheck {
  const chars = hanChars(text);
  // Match longer words first and blank them out, so 你好 does not also count 你 and 好.
  let rest = text;
  const used: string[] = [];
  for (const w of [...words].sort((a, b) => b.simplified.length - a.simplified.length)) {
    if (rest.includes(w.simplified)) {
      used.push(w.slug);
      rest = rest.split(w.simplified).join(" ");
    }
  }
  return {
    hanCount: chars.length,
    sentenceCount: text.split(/[。？！?!]+/).filter((s) => hanChars(s).length > 0).length,
    usedWords: used,
    unknown: [...new Set(chars.filter((c) => !knownChars.has(c)))],
  };
}

export interface ParagraphTask {
  prompt: string;
  hints: string[];
  minChars: number;
  minWords: number;
}

/** Writing prompts per lesson; lessons without one get a generic prompt from the title. */
const PARAGRAPH_PROMPTS: Record<string, Omit<ParagraphTask, "minChars" | "minWords">> = {
  "hsk1-01-greetings": { prompt: "Viết một đoạn hội thoại ngắn: bạn gặp thầy/cô giáo, chào hỏi, cảm ơn rồi tạm biệt.", hints: ["Chào ai đó", "Hỏi thăm / cảm ơn", "Tạm biệt"] },
  "hsk1-02-identity": { prompt: "Giới thiệu bản thân: tên, quốc tịch, bạn là ai (học sinh, giáo viên…).", hints: ["我叫…", "我是…人", "我是…"] },
  "hsk1-03-family": { prompt: "Giới thiệu gia đình bạn: nhà có mấy người, gồm những ai.", hints: ["我家有…口人", "爸爸、妈妈…", "Họ làm gì"] },
  "hsk1-04-numbers": { prompt: "Viết về các con số quanh bạn: tuổi của bạn, số người trong nhà, số điện thoại…", hints: ["我…岁", "…有几个…?", "Dùng lượng từ 个"] },
  "hsk1-05-time": { prompt: "Kể về một ngày của bạn: hôm nay là ngày mấy, thứ mấy, mấy giờ bạn làm gì.", hints: ["今天…月…号", "星期…", "…点…分"] },
  "hsk1-06-daily-actions": { prompt: "Kể những việc bạn làm hằng ngày: ăn, uống, đọc sách, xem TV, ngủ…", hints: ["我每天…", "喜欢 / 想", "Thời gian + hành động"] },
  "hsk1-07-school-work": { prompt: "Viết về trường học hoặc công việc của bạn: bạn học/làm ở đâu, với ai.", hints: ["我在…学习 / 工作", "同学、老师", "Bạn thích không?"] },
  "hsk1-08-location": { prompt: "Mô tả nhà hoặc lớp học của bạn: cái gì ở đâu (trên, dưới, trước, sau…).", hints: ["…在…", "…有…", "前面 / 后面 / 里"] },
  "hsk1-09-transport": { prompt: "Kể bạn đi học/đi làm như thế nào: đi bằng gì, đi đến đâu.", hints: ["坐…去…", "开车 / 飞机", "Mất bao lâu"] },
  "hsk1-10-shopping": { prompt: "Viết đoạn hội thoại mua đồ ở cửa hàng: hỏi giá, mua bao nhiêu.", hints: ["多少钱?", "…块", "我想买…"] },
  "hsk1-11-food": { prompt: "Kể về bữa ăn bạn thích: bạn thích ăn gì, uống gì, ăn ở đâu.", hints: ["我喜欢吃…", "喝茶 / 水", "饭店"] },
  "hsk1-12-weather-state": { prompt: "Viết về thời tiết hôm nay và cảm giác của bạn.", hints: ["今天天气…", "很热 / 很冷", "下雨"] },
  "hsk1-13-questions": { prompt: "Viết 4–5 câu hỏi để làm quen một người bạn mới (dùng 什么、哪、谁、几、怎么…).", hints: ["你叫什么名字?", "你是哪国人?", "Kết thúc câu hỏi bằng ？"] },
  "hsk1-14-objects-misc": { prompt: "Mô tả các đồ vật trong phòng bạn: có gì, bao nhiêu, của ai.", hints: ["我有…", "这是…的…", "Dùng lượng từ"] },
};

export function paragraphTask(lesson: { slug: string; title: string }, wordCount: number): ParagraphTask {
  const base = PARAGRAPH_PROMPTS[lesson.slug] ?? { prompt: `Viết một đoạn văn ngắn về chủ đề «${lesson.title}».`, hints: ["Dùng từ vựng của bài", "Mỗi câu kết thúc bằng 。"] };
  return { ...base, minChars: 30, minWords: Math.min(5, wordCount) };
}
