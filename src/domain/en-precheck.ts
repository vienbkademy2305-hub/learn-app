/**
 * Instant checks on a homework text, no AI and no sign-in: length against the target, paragraphs, sentence
 * length, linking words, repeated words and the learner's known slips (lowercase "i", comma splices, missing
 * capital letters). Shown before the AI grading so the learner can fix the obvious things first.
 */
import { countWords } from "./en-grade";

export type PrecheckLevel = "ok" | "warn" | "bad";
export interface PrecheckItem {
  id: string;
  level: PrecheckLevel;
  text: string;
}

const LINKERS = [
  "however", "therefore", "moreover", "furthermore", "although", "because", "while", "whereas", "in addition", "for example", "for instance",
  "first", "firstly", "second", "secondly", "finally", "in conclusion", "on the other hand", "as a result", "besides", "also", "but", "so", "then", "after that",
];
const STOP = new Set("the a an and or but of to in on at for with is are was were be been am i you he she it we they my your his her our their this that these those not do does did have has had will would can could very so as by from".split(" "));

const sentencesOf = (text: string) => text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => /[a-z]/i.test(s));

export function precheck(text: string, words?: { min: number; max: number }): PrecheckItem[] {
  const out: PrecheckItem[] = [];
  const add = (id: string, level: PrecheckLevel, t: string) => out.push({ id, level, text: t });
  const n = countWords(text);
  if (n === 0) return out;

  // Vietnamese instead of English
  const viMarks = (text.match(/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi) ?? []).length;
  if (viMarks >= 3) add("vietnamese", "bad", "Có nhiều chữ tiếng Việt có dấu — bài cần viết hoàn toàn bằng tiếng Anh.");

  if (words) {
    if (n < words.min) add("length", n < words.min * 0.6 ? "bad" : "warn", `Còn thiếu ${words.min - n} từ so với mức tối thiểu ${words.min}.`);
    else if (n > words.max) add("length", "warn", `Dài hơn khung ${words.max} từ (${n - words.max} từ). Tỉa bớt ý lặp.`);
    else add("length", "ok", `Độ dài ${n} từ — đúng khung ${words.min}–${words.max}.`);
  }

  const sentences = sentencesOf(text);
  const avg = sentences.length ? n / sentences.length : n;
  if (n >= 25 && avg < 7) add("short", "warn", `Câu trung bình chỉ ${avg.toFixed(1)} từ — thử nối hai câu bằng because / although / which.`);
  if (avg > 28) add("long", "warn", `Câu trung bình ${avg.toFixed(0)} từ — có câu quá dài, tách bớt để dễ đọc.`);

  if (words && words.min >= 120 && !/\n\s*\n/.test(text.trim())) add("paragraphs", "warn", "Bài dài nhưng chưa chia đoạn — mỗi đoạn một ý chính (cách một dòng trống).");

  const lower = ` ${text.toLowerCase()} `;
  const linkers = LINKERS.filter((l) => new RegExp(`[^a-z]${l}[^a-z]`).test(lower));
  if (n >= 40) add("linkers", linkers.length >= 3 ? "ok" : "warn", linkers.length >= 3 ? `Từ nối đã dùng: ${linkers.slice(0, 5).join(", ")}.` : "Ít từ nối (chỉ " + linkers.length + ") — thêm however / for example / because…");

  // repeated content words
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) if (w.length > 3 && !STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const rep = [...freq].filter(([, c]) => c >= Math.max(4, Math.round(n / 25))).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (rep.length) add("repeat", "warn", `Lặp nhiều: ${rep.map(([w, c]) => `“${w}” ×${c}`).join(", ")} — dùng đại từ hoặc từ đồng nghĩa.`);

  // known slips
  const lowI = (text.match(/(^|[\s(])i(?=[\s',.!?;])/g) ?? []).length;
  if (lowI) add("capital-i", "bad", `Có ${lowI} chỗ viết “i” thường — luôn viết hoa I.`);
  const noCap = sentences.filter((s) => /^[a-z]/.test(s)).length;
  if (noCap) add("capital-start", "warn", `${noCap} câu không bắt đầu bằng chữ hoa.`);
  const noStop = text.trim() && !/[.!?]["')]*$/.test(text.trim());
  if (noStop) add("end-punct", "warn", "Câu cuối chưa có dấu chấm.");
  const splice = sentences.filter((s) => /,\s*(i|he|she|it|we|they|you|my|the|this|there)\s+\w+/i.test(s) && !/\b(and|but|so|because|although|while|which|who|that|when|if)\b/i.test(s)).length;
  if (splice) add("comma-splice", "warn", `${splice} câu có thể đang nối hai câu bằng dấu phẩy — tách thành hai câu hoặc thêm and/but/because.`);
  const dbl = text.match(/\b(\w+)\s+\1\b/i);
  if (dbl && !/^(that|had)$/i.test(dbl[1]!)) add("double", "warn", `Lặp từ liền nhau: “${dbl[0]}”.`);
  return out;
}

/** True when sending to the AI would waste a grading (empty, Vietnamese, far too short). */
export function worthGrading(items: PrecheckItem[], wordCount: number): { ok: boolean; why?: string } {
  if (wordCount < 8) return { ok: false, why: "Bài quá ngắn để chấm (dưới 8 từ)." };
  if (items.some((i) => i.id === "vietnamese")) return { ok: false, why: "Bài đang có tiếng Việt — viết lại bằng tiếng Anh rồi chấm." };
  return { ok: true };
}
