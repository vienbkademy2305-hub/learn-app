/**
 * Pronunciation report, ELSA style (docs/ELSA_PRONUNCIATION_PLAN.md): an overall %, a % and a colour for every word, and for
 * wrong words the sounds that differ, with a short Vietnamese tip. Two sources feed the same report:
 *  - the browser's speech recognition (works on the phone): which words were said, what was heard instead;
 *    sounds are compared through the IPA of the two words when both are in the dictionary;
 *  - the OpenPronounce server (computer): real per-sound confidences.
 * Pure functions.
 */
import { editDistance, enTokens, sameWord, type SpeechAssessment } from "./speech-match";

export type Level = "good" | "ok" | "bad";
export type WordStatus = "good" | "ok" | "bad" | "missed";

export const GOOD_FROM = 85;
export const OK_FROM = 60;

export const levelOf = (percent: number): Level => (percent >= GOOD_FROM ? "good" : percent >= OK_FROM ? "ok" : "bad");

export function labelOf(percent: number): string {
  return percent >= 85 ? "Xuất sắc" : percent >= 70 ? "Tốt" : percent >= 50 ? "Khá" : "Cần luyện";
}

export interface PhoneReport {
  expected: string;
  /** what was heard in its place; null = not heard at all */
  heard: string | null;
  ok: boolean;
  /** 0–100 when the source measures it (server) */
  percent?: number;
}

export interface WordReport {
  word: string;
  status: WordStatus;
  percent: number;
  ipa?: string;
  heard?: string;
  heardIpa?: string;
  phones?: PhoneReport[];
  tip?: string;
}

export interface Report {
  source: "browser" | "server";
  overall: number;
  label: string;
  words: WordReport[];
  heardText: string;
  pace?: SpeechAssessment["pace"];
  /** one general tip (recognizer unsure, speaking too fast …) */
  note?: string;
}

/* ---------- IPA ---------- */

const MULTI = ["tʃ", "dʒ", "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "oʊ", "ɪə", "eə", "ʊə"];

/** "/əˈdres/" → ["ə","d","r","e","s"]; affricates, diphthongs and long vowels stay one sound. */
export function ipaPhones(ipa: string): string[] {
  const s = ipa.replace(/[/[\]ˈˌ.()\s]/g, "");
  const out: string[] = [];
  for (let i = 0; i < s.length; ) {
    const two = s.slice(i, i + 2);
    let tok = MULTI.includes(two) ? two : s[i]!;
    i += tok.length;
    if (s[i] === "ː") {
      tok += "ː";
      i++;
    }
    out.push(tok);
  }
  return out;
}

/** Aligns the sounds of the word to say with the sounds heard (edit distance); one entry per expected sound. */
export function alignPhones(expected: string[], heard: string[]): PhoneReport[] {
  const n = expected.length;
  const m = heard.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (expected[i - 1] === heard[j - 1] ? 0 : 1));
  const out: PhoneReport[] = [];
  for (let i = n, j = m; i > 0; ) {
    if (j > 0 && d[i]![j] === d[i - 1]![j - 1]! + (expected[i - 1] === heard[j - 1] ? 0 : 1)) {
      const same = expected[i - 1] === heard[j - 1];
      out.push({ expected: expected[i - 1]!, heard: heard[j - 1]!, ok: same });
      i--;
      j--;
    } else if (d[i]![j] === d[i - 1]![j]! + 1) {
      out.push({ expected: expected[i - 1]!, heard: null, ok: false });
      i--;
    } else j--; // an extra sound that was heard: not part of the expected word
  }
  return out.reverse();
}

/* ---------- Vietnamese tips ---------- */

interface Tip {
  /** the sound to make */
  say: string;
  how: string;
}
const TIPS: Record<string, Tip> = {
  θ: { say: "/θ/ (th trong think)", how: "Đặt đầu lưỡi nhẹ giữa hai hàm răng rồi thổi hơi ra, không rung dây thanh. Đừng đọc thành “s” hay “t”." },
  ð: { say: "/ð/ (th trong this)", how: "Đặt đầu lưỡi giữa hai hàm răng như /θ/ nhưng có rung cổ họng. Đừng đọc thành “d” hay “z”." },
  ʃ: { say: "/ʃ/ (sh)", how: "Chu môi, đưa lưỡi lùi lại một chút, thổi hơi như tiếng “suỵt”. Không đọc là “s”." },
  ʒ: { say: "/ʒ/ (s trong vision)", how: "Giống /ʃ/ nhưng có rung cổ họng. Không đọc là “z” hay “d”." },
  tʃ: { say: "/tʃ/ (ch)", how: "Bật “t” rồi chuyển ngay sang /ʃ/. Nhẹ hơn “ch” tiếng Việt, môi hơi chu." },
  dʒ: { say: "/dʒ/ (j, g mềm)", how: "Bật “d” rồi chuyển sang /ʒ/ có rung cổ họng, như “gi” nhưng bật hơi mạnh hơn." },
  r: { say: "/r/", how: "Cuộn lưỡi lên không chạm vòm miệng, môi hơi tròn. Không rung lưỡi như “r” tiếng Việt vùng miền." },
  l: { say: "/l/", how: "Đầu lưỡi chạm lợi trên phía sau răng cửa. Ở cuối từ, giữ lưỡi chạm lợi chứ đừng bỏ qua." },
  ŋ: { say: "/ŋ/ (ng cuối từ)", how: "Gốc lưỡi chạm ngạc mềm, hơi thoát qua mũi. Không thêm âm “g” rõ ràng, không đọc thành “n”." },
  v: { say: "/v/", how: "Răng trên chạm nhẹ môi dưới và rung cổ họng. Không đọc là “b” hay “d”." },
  z: { say: "/z/", how: "Như /s/ nhưng có rung cổ họng. Âm cuối “-s” sau nguyên âm cũng đọc là /z/." },
  s: { say: "/s/", how: "Hơi thoát qua kẽ răng, không rung cổ họng. Đừng bỏ âm “s” cuối từ (số nhiều, động từ ngôi 3)." },
  t: { say: "/t/", how: "Bật hơi nhẹ khi đầu lưỡi rời lợi trên. Âm cuối “-t” cần được đọc, đừng nuốt mất." },
  d: { say: "/d/", how: "Đầu lưỡi chạm lợi trên rồi bật, có rung cổ họng. Âm cuối “-d/-ed” cần được đọc." },
  k: { say: "/k/", how: "Gốc lưỡi chạm ngạc mềm rồi bật hơi. Âm cuối “-k” đừng nuốt mất." },
  p: { say: "/p/", how: "Hai môi mím rồi bật hơi. Âm cuối “-p” cần được đọc." },
  h: { say: "/h/", how: "Thở hơi ra từ cổ họng, không có tiếng cọ xát ở lưỡi." },
  ɪ: { say: "/ɪ/ (i ngắn)", how: "Ngắn và lỏng, miệng hơi mở, khác /iː/ kéo dài (ship ≠ sheep)." },
  "iː": { say: "/iː/ (i dài)", how: "Kéo dài, môi bành ra như cười. Khác /ɪ/ ngắn." },
  æ: { say: "/æ/ (a bẹt)", how: "Mở miệng rộng như “a”, khóe môi kéo ngang, lưỡi thấp. Không đọc là “e”." },
  e: { say: "/e/", how: "Miệng mở vừa, giống “e” tiếng Việt nhưng ngắn hơn." },
  ʌ: { say: "/ʌ/ (ơ ngắn, u trong cup)", how: "Miệng mở nhỏ, thả lỏng, âm ngắn gần “â”." },
  ɒ: { say: "/ɒ/ (o ngắn)", how: "Tròn môi, miệng mở, âm ngắn." },
  "uː": { say: "/uː/ (u dài)", how: "Chu môi tròn, kéo dài. Khác /ʊ/ ngắn." },
  ʊ: { say: "/ʊ/ (u ngắn)", how: "Môi hơi tròn, thả lỏng, ngắn." },
  ə: { say: "/ə/ (âm yếu)", how: "Âm “ơ” rất nhẹ và ngắn ở âm tiết không nhấn." },
  "ɜː": { say: "/ɜː/ (er)", how: "Kéo dài “ơ”, môi thả lỏng, lưỡi giữa." },
};

/** A short Vietnamese tip for one wrong sound (what to do with the mouth), or "" when there is nothing specific. */
export function tipFor(expected: string, heard: string | null): string {
  const t = TIPS[expected];
  if (!t) return "";
  const missing = heard === null;
  return `${missing ? "Bạn bỏ mất" : "Cần đọc"} ${t.say}. ${t.how}`;
}

/** The most useful tip of a word: the first wrong sound with a tip; a dropped final consonant gets its own reminder. */
export function wordTip(phones: PhoneReport[]): string {
  const wrong = phones.filter((p) => !p.ok);
  const last = phones[phones.length - 1];
  if (last && !last.ok && last.heard === null && /^[ptkbdgszʃʒmnŋlrvfθðʧʤ]|^tʃ|^dʒ/.test(last.expected)) {
    return tipFor(last.expected, null) || "Đừng nuốt âm cuối của từ: đọc rõ cả phụ âm cuối.";
  }
  for (const p of wrong) {
    const t = tipFor(p.expected, p.heard);
    if (t) return t;
  }
  return wrong.length ? "Nghe mẫu chậm rồi đọc lại, chú ý các âm tô đỏ." : "";
}

/* ---------- browser source ---------- */

export type IpaDictionary = Record<string, string>;

/** Pairs expected words with heard words: LCS anchors, then substitutions inside the gaps. */
export function alignWords(expected: string[], heard: string[]): Array<{ heard: string | null; exact: boolean }> {
  const n = expected.length;
  const m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i]![j] = sameWord(expected[i]!, heard[j]!) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const result: Array<{ heard: string | null; exact: boolean }> = new Array(n).fill(null).map(() => ({ heard: null, exact: false }));
  const anchors: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (sameWord(expected[i]!, heard[j]!)) {
      anchors.push([i, j]);
      result[i] = { heard: heard[j]!, exact: expected[i] === heard[j] };
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  // substitutions: unmatched expected words and unmatched heard words between two anchors, in order
  const bounds: Array<[number, number]> = [[-1, -1], ...anchors, [n, m]];
  for (let a = 0; a < bounds.length - 1; a++) {
    const [ei, hj] = bounds[a]!;
    const [ei2, hj2] = bounds[a + 1]!;
    const es = Array.from({ length: Math.max(0, ei2 - ei - 1) }, (_, k) => ei + 1 + k);
    const hs = Array.from({ length: Math.max(0, hj2 - hj - 1) }, (_, k) => hj + 1 + k);
    for (let k = 0; k < Math.min(es.length, hs.length); k++) result[es[k]!] = { heard: heard[hs[k]!]!, exact: false };
  }
  return result;
}

const letterSimilarity = (a: string, b: string) => 1 - editDistance(a, b) / Math.max(a.length, b.length, 1);

/** Report from what the browser's recognizer heard. `dict` maps lower-case words to their IPA (optional). */
export function browserReport(text: string, assessment: SpeechAssessment, heardText: string, dict: IpaDictionary = {}): Report {
  const pieces = text.split(/\s+/).filter(Boolean);
  const tokensOf = pieces.map((p) => enTokens(p));
  const flat = tokensOf.flat();
  const heardTokens = heardText.split(/\s+/).flatMap(enTokens);
  const aligned = alignWords(flat, heardTokens);
  const conf = assessment.confidence;
  const base = conf ? Math.round(80 + 20 * conf) : 96;

  let k = 0;
  const words: WordReport[] = pieces.map((piece, i) => {
    const toks = tokensOf[i]!;
    const parts = aligned.slice(k, k + toks.length);
    const expectedTok = toks.join("");
    k += toks.length;
    const heard = parts.map((p) => p.heard).filter((h): h is string => h !== null);
    const ipa = dict[expectedTok] ?? dict[piece.toLowerCase().replace(/[^a-z'-]/g, "")];
    if (toks.length === 0) return { word: piece, status: "good", percent: 100 };
    if (parts.every((p) => p.heard !== null && p.exact)) return { word: piece, status: "good", percent: base, ipa };
    if (parts.every((p) => p.heard !== null && sameWord(expectedTok, heard.join("")) )) return { word: piece, status: "ok", percent: Math.min(80, base - 10), ipa, heard: heard.join(" ") };
    if (heard.length === 0) return { word: piece, status: "missed", percent: 0, ipa, tip: "Máy không nghe thấy từ này — đọc to và rõ hơn, đừng bỏ qua từ." };
    const heardWord = heard.join(" ");
    const heardKey = heard.join("");
    const heardIpa = dict[heardKey];
    let percent = Math.round(letterSimilarity(expectedTok, heardKey) * 55);
    let phones: PhoneReport[] | undefined;
    let tip = "";
    if (ipa && heardIpa) {
      phones = alignPhones(ipaPhones(ipa), ipaPhones(heardIpa));
      const okShare = phones.filter((p) => p.ok).length / Math.max(1, phones.length);
      percent = Math.min(79, Math.round(okShare * 75));
      tip = wordTip(phones);
    } else {
      tip = `Máy nghe thành “${heardWord}”. Nghe mẫu chậm rồi đọc lại, chú ý từng âm.`;
    }
    return { word: piece, status: "bad", percent: Math.max(5, percent), ipa, heard: heardWord, heardIpa, phones, tip };
  });

  const note = assessment.tip || undefined;
  return { source: "browser", overall: assessment.score, label: labelOf(assessment.score), words, heardText, pace: assessment.pace, note };
}

/* ---------- server source (OpenPronounce) ---------- */

export interface ServerWordError {
  position: number;
  word: string;
  expected: string;
  actual: string;
  confidence: number;
  phones?: Array<{ expected: string; heard: string; confidence: number }>;
}
export interface ServerResult {
  score: number;
  transcribe: string;
  differences: { errors: ServerWordError[]; words_with_errors: string[] };
}

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

/** Report from the OpenPronounce server: real per-sound confidences. */
export function serverReport(text: string, res: ServerResult): Report {
  const pieces = text.split(/\s+/).filter(Boolean);
  const errors = new Map(res.differences.errors.map((e) => [norm(e.word), e]));
  const base = Math.max(85, Math.round(res.score));
  const words: WordReport[] = pieces.map((piece) => {
    const e = errors.get(norm(piece));
    if (!e) return { word: piece, status: "good", percent: base };
    const phones: PhoneReport[] | undefined = e.phones?.map((p) => ({ expected: p.expected || "∅", heard: p.heard || null, ok: !!p.expected && p.expected === p.heard, percent: Math.round(p.confidence * 100) }));
    const wrongPhones = phones?.filter((p) => !p.ok) ?? [];
    const percent = phones && phones.length ? Math.round((phones.filter((p) => p.ok).length / phones.length) * 100) : Math.round(e.confidence * 100);
    return {
      word: piece,
      status: percent >= OK_FROM ? "ok" : "bad",
      percent: Math.min(percent, base - 1),
      ipa: e.expected ? `/${e.expected}/` : undefined,
      heardIpa: e.actual ? `/${e.actual}/` : undefined,
      phones,
      tip: phones && wrongPhones.length ? wordTip(phones) : "Nghe mẫu chậm rồi đọc lại.",
    };
  });
  const overall = Math.round(res.score);
  return { source: "server", overall, label: labelOf(overall), words, heardText: res.transcribe.toLowerCase() };
}

/** Words to practise again, worst first. */
export const weakWords = (r: Report) => r.words.filter((w) => w.status !== "good").sort((a, b) => a.percent - b.percent);
