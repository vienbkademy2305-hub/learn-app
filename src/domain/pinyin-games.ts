/**
 * "Nhập môn phát âm" as short missions (docs/UI_POLISH_PLAN.md): the lesson-0 facts turned into quick questions with a
 * Vietnamese memory aid per mission. Pure: the question builders take the lesson data and a random generator.
 */
import { shuffle, type Rng } from "./exercises";
import { syllableToMarked } from "./pinyin";

export type MissionId = "tone-listen" | "tone-draw" | "initials" | "finals" | "confusable" | "spelling" | "sandhi" | "flip" | "boss";

export interface PgOption {
  text: string;
  sub?: string;
}

export interface PgQuestion {
  id: string;
  /** title shown on the quiz screen */
  title: string;
  /** character read aloud by the device voice (listening questions) */
  hanzi?: string;
  /** a line of text under the title */
  prompt?: string;
  /** tone contour to draw: pitch heights 1–5 */
  contour?: number[];
  options: PgOption[];
  answer: number;
  /** what to say after answering */
  explain: string;
}

export interface Mission {
  id: MissionId;
  icon: string;
  title: string;
  hint: string;
  /** the memory aid shown before the questions */
  tip: string[];
  /** needs the device voice */
  listen: boolean;
}

export const MISSIONS: Mission[] = [
  {
    id: "tone-listen",
    icon: "👂",
    title: "Nghe thanh điệu",
    hint: "Nghe một chữ, chọn thanh 1, 2, 3 hay 4",
    listen: true,
    tip: [
      "Thanh 1 ā: giọng CAO và BẰNG, như kéo dài nốt cao khi hát “aaa”.",
      "Thanh 2 á: đi LÊN như khi bạn hỏi lại “hả?”. Gần dấu sắc.",
      "Thanh 3 ǎ: XUỐNG thấp rồi mới lên, như “ủa?” ngạc nhiên. Gần dấu hỏi.",
      "Thanh 4 à: RƠI mạnh từ cao xuống, ngắn như ra lệnh “đi!”.",
      "Mẹo nhớ câu: “Mẹ (mā) tê (má) ngựa (mǎ) mắng (mà)” — cùng âm “ma”, đổi thanh là đổi nghĩa.",
    ],
  },
  {
    id: "tone-draw",
    icon: "✏️",
    title: "Vẽ đường thanh",
    hint: "Nhìn đường lên xuống, chọn đúng dấu",
    listen: false,
    tip: [
      "Dùng ngón tay vẽ đường thanh trong không khí khi bạn đọc: bằng cao, lên, xuống rồi lên, rơi xuống.",
      "Mỗi thanh có một HÌNH riêng: — (ngang), ↗ (lên), ↘↗ (võng), ↘ (rơi).",
      "Dấu trên nguyên âm cũng giống hình đường thanh: ā ngang, á dốc lên, ǎ chữ V, à dốc xuống.",
    ],
  },
  {
    id: "initials",
    icon: "🅱️",
    title: "Thanh mẫu",
    hint: "Nghe chữ, chọn phụ âm đầu",
    listen: true,
    tip: [
      "b/p: đặt TỜ GIẤY trước miệng. p làm giấy bay (bật hơi), b thì giấy đứng yên.",
      "d/t, g/k giống cặp b/p: d, g không bật hơi; t, k bật hơi.",
      "zh ch sh r: LƯỠI CONG lên như cái thìa. z c s: lưỡi PHẲNG như con dao, đầu lưỡi sau răng.",
      "j q x: môi bành như cười “i”, lưỡi áp hàm dưới. Đừng đọc thành “gi”, “ch”, “x” tiếng Việt.",
    ],
  },
  {
    id: "finals",
    icon: "🅰️",
    title: "Vận mẫu",
    hint: "Nghe chữ, chọn phần vần",
    listen: true,
    tip: [
      "ü: chu môi như đọc “u” rồi nói “i” — môi tròn, lưỡi như “i”. Hai chấm nhắc bạn môi phải tròn.",
      "ao, ou, ai, ei: trượt từ âm đầu sang âm cuối, đừng đọc rời hai nguyên âm.",
      "an/ang, en/eng, in/ing: chữ “g” cuối nghĩa là âm mũi sau (ng), không có g là âm mũi trước (n).",
    ],
  },
  {
    id: "confusable",
    icon: "🎯",
    title: "Cặp dễ nhầm",
    hint: "zhī / zī / jī… nghe và chọn đúng",
    listen: true,
    tip: [
      "Chú ý VỊ TRÍ LƯỠI, không chỉ là chữ cái: zh/ch/sh cong lưỡi, z/c/s lưỡi phẳng, j/q/x môi bành.",
      "Nghe thật chậm bằng nút “Chậm”, nhắm mắt và đoán xem lưỡi người nói đang ở đâu.",
    ],
  },
  {
    id: "spelling",
    icon: "🔤",
    title: "Quy tắc viết",
    hint: "y, w, ü, iu, ui, un — chọn cách viết đúng",
    listen: false,
    tip: [
      "Không có thanh mẫu thì viết y/w: i → yi, u → wu, ü → yu.",
      "ü gặp j, q, x, y thì BỎ hai chấm: ju, qu, xu, yu (vẫn đọc ü).",
      "iou → iu, uei → ui, uen → un khi có phụ âm đầu: liu, gui, lun.",
    ],
  },
  {
    id: "sandhi",
    icon: "🔀",
    title: "Biến điệu",
    hint: "Hai thanh 3 gặp nhau, 不 và 一 đổi thanh",
    listen: false,
    tip: [
      "Hai thanh 3 đứng cạnh nhau: âm đầu đổi thành thanh 2. nǐ hǎo → ní hǎo (như “tránh va chạm”).",
      "不 (bù) đứng trước thanh 4 thì đọc bú: bú shì, bú yào.",
      "一 (yī) đứng trước thanh 4 đọc yí, trước thanh 1/2/3 đọc yì.",
    ],
  },
  {
    id: "flip",
    icon: "🃏",
    title: "Lật thẻ thanh mẫu",
    hint: "Ghép chữ ví dụ với thanh mẫu của nó",
    listen: false,
    tip: ["Mỗi thanh mẫu có một chữ ví dụ. Lật hai thẻ: thẻ chữ Hán và thẻ thanh mẫu của nó.", "Đọc to cả hai khi ghép đúng — nhớ bằng miệng thì lâu hơn nhớ bằng mắt."],
  },
  {
    id: "boss",
    icon: "🏆",
    title: "Thử thách tổng hợp",
    hint: "15 câu trộn tất cả, cần 70% để qua",
    listen: true,
    tip: ["Trộn mọi thứ vừa học: thanh điệu, thanh mẫu, vận mẫu, quy tắc viết, biến điệu.", "Sai câu nào, app sẽ nhắc lại mẹo đúng của câu đó."],
  },
];

/* ---------- builders ---------- */

const TONE_NAMES = ["", "thanh 1 (ngang cao)", "thanh 2 (lên)", "thanh 3 (xuống rồi lên)", "thanh 4 (rơi xuống)"];
export const CONTOURS: Record<number, number[]> = { 1: [5, 5], 2: [3, 5], 3: [2, 1, 4], 4: [5, 1] };
const BASES = ["ma", "ba", "ni", "shi", "wo", "ta", "li", "da", "xi", "hao", "nian", "yu"];

export interface ListenLike {
  kind: "tone" | "sound";
  hanzi: string;
  answer: string;
  choices: Array<{ text: string; sub?: string; correct: boolean }>;
}

/** Existing listening questions (domain/pronunciation.ts) → mission questions. */
export function fromListen(qs: ListenLike[], idPrefix: string): PgQuestion[] {
  return qs.map((q, i) => ({
    id: `${idPrefix}-${i}`,
    title: q.kind === "tone" ? "Nghe và chọn thanh điệu" : "Nghe và chọn pinyin",
    hanzi: q.hanzi,
    options: q.choices.map((c) => ({ text: c.text, sub: c.sub })),
    answer: Math.max(0, q.choices.findIndex((c) => c.correct)),
    explain: `Đáp án: ${q.answer}.`,
  }));
}

/** Contour → mark: "which syllable has this tone?" */
export function buildToneDraw(rng: Rng, count = 8): PgQuestion[] {
  const out: PgQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const tone = ((i + Math.floor(rng() * 4)) % 4) + 1;
    const base = BASES[Math.floor(rng() * BASES.length)]!;
    out.push({
      id: `draw-${i}`,
      title: "Đường thanh này là dấu nào?",
      prompt: `Chọn âm tiết “${base}” đúng thanh.`,
      contour: CONTOURS[tone],
      options: [1, 2, 3, 4].map((t) => ({ text: syllableToMarked(`${base}${t}`), sub: TONE_NAMES[t] })),
      answer: tone - 1,
      explain: `Đường này là ${TONE_NAMES[tone]}: ${syllableToMarked(`${base}${tone}`)}.`,
    });
  }
  return out;
}

export interface SoundEntry {
  sound: string;
  hanzi: string;
  pinyin: string;
  vi: string;
}

/** Hear an example character → pick its initial/final among sounds of the same kind. */
export function buildSoundPick(groups: SoundEntry[][], kind: "thanh mẫu" | "vận mẫu", rng: Rng, count = 10): PgQuestion[] {
  const all = groups.flat();
  const out: PgQuestion[] = [];
  const pool = shuffle(all, rng);
  for (const target of pool) {
    if (out.length >= count) break;
    const group = groups.find((g) => g.includes(target)) ?? [];
    const near = shuffle(group.filter((x) => x.sound !== target.sound), rng);
    const far = shuffle(all.filter((x) => x.sound !== target.sound && !near.includes(x)), rng);
    const others = [...near, ...far].filter((x, i, a) => a.findIndex((y) => y.sound === x.sound) === i).slice(0, 3);
    if (others.length < 3) continue;
    const options = shuffle([target, ...others], rng);
    out.push({
      id: `${kind}-${out.length}`,
      title: `Nghe và chọn ${kind}`,
      hanzi: target.hanzi,
      prompt: `Chữ vừa nghe bắt đầu/kết thúc bằng ${kind} nào?`,
      options: options.map((o) => ({ text: o.sound })),
      answer: options.indexOf(target),
      explain: `${target.pinyin}: ${kind} “${target.sound}” — ${target.vi}.`,
    });
  }
  return out;
}

export interface SpellingCard {
  right: string;
  wrong: string[];
  why: string;
}

/** Spelling rules as "which is written correctly?" cards. */
export const SPELLING_CARDS: SpellingCard[] = [
  { right: "yī", wrong: ["ī", "ii"], why: "Vận mẫu i đứng một mình thì viết thành yi." },
  { right: "wǒ", wrong: ["uǒ", "uo"], why: "Vận mẫu u/uo đứng một mình viết thành w: wu, wo." },
  { right: "yǔ", wrong: ["ǚ", "yü"], why: "ü đứng một mình viết yu (bỏ hai chấm, thêm y)." },
  { right: "jù", wrong: ["jǜ", "jiu"], why: "Sau j, q, x, ü bỏ hai chấm: ju, qu, xu — vẫn đọc là ü." },
  { right: "qù", wrong: ["qǜ", "qou"], why: "Sau j, q, x, ü bỏ hai chấm: qu đọc là “chü”." },
  { right: "liú", wrong: ["lióu", "liou"], why: "iou rút gọn thành iu khi có phụ âm đầu: liu." },
  { right: "guì", wrong: ["guèi", "gueì"], why: "uei rút gọn thành ui khi có phụ âm đầu: gui." },
  { right: "lún", wrong: ["luèn", "luen"], why: "uen rút gọn thành un khi có phụ âm đầu: lun." },
  { right: "nǚ", wrong: ["nǔ", "nyu"], why: "Sau n, l vẫn giữ hai chấm của ü: nü, lü (khác nu, lu)." },
  { right: "yǒu", wrong: ["iǒu", "yǒ"], why: "iou đứng một mình viết you." },
  { right: "wǔ", wrong: ["ǔ", "uǔ"], why: "u đứng một mình viết wu." },
  { right: "yuè", wrong: ["üè", "yüè"], why: "üe đứng một mình viết yue." },
];

export function buildSpelling(rng: Rng, count = 8): PgQuestion[] {
  return shuffle(SPELLING_CARDS, rng)
    .slice(0, count)
    .map((c, i) => {
      const options = shuffle([c.right, ...c.wrong], rng);
      return {
        id: `spell-${i}`,
        title: "Cách viết pinyin nào đúng?",
        options: options.map((text) => ({ text })),
        answer: options.indexOf(c.right),
        explain: `${c.right} — ${c.why}`,
      };
    });
}

export interface SandhiExample {
  hanzi: string;
  written: string;
  spoken: string;
  rule: string;
}

/** A syllable string with the tone of the first syllable changed (used for wrong options). */
function altTone(pinyin: string): string[] {
  const swaps: Record<string, string> = { "ǎ": "á", "á": "ǎ", "ì": "í", "í": "ì", "ī": "í", "ǐ": "í", "ǒ": "ó", "ú": "ǔ", "ù": "ú", "è": "é", "é": "è" };
  const chars = [...pinyin];
  const i = chars.findIndex((c) => c in swaps);
  if (i < 0) return [];
  const flipped = [...chars];
  flipped[i] = swaps[chars[i]!]!;
  return [flipped.join("")];
}

export function buildSandhi(examples: SandhiExample[], rng: Rng, count = 6): PgQuestion[] {
  const out: PgQuestion[] = [];
  for (const ex of shuffle(examples, rng)) {
    if (out.length >= count) break;
    const wrong = [ex.written, ...altTone(ex.spoken), ...altTone(ex.written)].filter((w, i, a) => w !== ex.spoken && a.indexOf(w) === i).slice(0, 3);
    if (wrong.length < 2) continue;
    const options = shuffle([ex.spoken, ...wrong], rng);
    out.push({
      id: `sandhi-${out.length}`,
      title: "Thực tế đọc thế nào?",
      hanzi: ex.hanzi,
      prompt: `${ex.hanzi} viết là ${ex.written}.`,
      options: options.map((text) => ({ text })),
      answer: options.indexOf(ex.spoken),
      explain: `${ex.hanzi}: viết ${ex.written} nhưng đọc ${ex.spoken}. ${ex.rule}`,
    });
  }
  return out;
}

/** 15 questions from every other mission, for the final challenge. */
export function buildBoss(parts: PgQuestion[][], rng: Rng, count = 15): PgQuestion[] {
  const pools = parts.map((p) => shuffle(p, rng)).filter((p) => p.length > 0);
  const out: PgQuestion[] = [];
  for (let i = 0; out.length < count && pools.some((p) => i < p.length); i++) {
    for (const p of pools) if (i < p.length && out.length < count) out.push({ ...p[i]!, id: `boss-${out.length}` });
  }
  return shuffle(out, rng);
}

/** Stars for a finished mission: 3 from 90 %, 2 from 70 %, 1 below (finishing always earns one). */
export function missionStars(correct: number, total: number): 1 | 2 | 3 {
  const p = total ? correct / total : 0;
  return p >= 0.9 ? 3 : p >= 0.7 ? 2 : 1;
}

export interface PinyinProgress {
  v: 1;
  /** mission → best stars */
  stars: Partial<Record<MissionId, number>>;
}
export const EMPTY_PINYIN: PinyinProgress = { v: 1, stars: {} };

export function recordMission(p: PinyinProgress, id: MissionId, stars: number): { state: PinyinProgress; improved: boolean } {
  const prev = p.stars[id] ?? 0;
  if (stars <= prev) return { state: p, improved: prev === 0 };
  return { state: { ...p, stars: { ...p.stars, [id]: stars } }, improved: true };
}

export const totalStars = (p: PinyinProgress) => Object.values(p.stars).reduce((a, b) => a + (b ?? 0), 0);
export const maxStars = () => MISSIONS.length * 3;
export const parsePinyin = (raw: unknown): PinyinProgress => {
  if (!raw || typeof raw !== "object") return EMPTY_PINYIN;
  const r = raw as Partial<PinyinProgress>;
  if (r.v !== 1 || !r.stars || typeof r.stars !== "object") return EMPTY_PINYIN;
  const stars: PinyinProgress["stars"] = {};
  for (const m of MISSIONS) {
    const v = (r.stars as Record<string, unknown>)[m.id];
    if (typeof v === "number" && v >= 1 && v <= 3) stars[m.id] = Math.round(v);
  }
  return { v: 1, stars };
};
