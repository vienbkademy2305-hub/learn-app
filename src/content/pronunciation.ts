/**
 * Lesson 0 — pronunciation and pinyin (docs/PHASE6_PINYIN_PLAN.md).
 * Editorial content written by Claude (AI) on 2026-09-28 — DRAFT, needs review by a teacher.
 * Vietnamese comparisons are approximations to help beginners, not exact phonetics.
 * Every sound has an example character that the device's Mandarin voice reads aloud
 * (no recorded syllable audio exists in the sources — REPO_AUDIT §9).
 */

export const PRONUNCIATION_DRAFT = true;

export interface SoundItem {
  /** pinyin of the sound as taught (initial, final or syllable) */
  sound: string;
  /** example character spoken by the device voice */
  hanzi: string;
  /** tone-marked pinyin of the example */
  pinyin: string;
  /** Vietnamese approximation */
  vi: string;
  /** a common trap for Vietnamese learners */
  warn?: string;
}

export interface SoundGroup {
  title: string;
  note?: string;
  items: SoundItem[];
}

export const TONES = [
  { tone: 1, mark: "ā", name: "Thanh 1", contour: [5, 5], vi: "Cao và bằng, giữ giọng cao đều (như hát nốt cao). Gần giống chữ không dấu nhưng cao hơn.", example: { hanzi: "妈", pinyin: "mā", meaning: "mẹ" } },
  { tone: 2, mark: "á", name: "Thanh 2", contour: [3, 5], vi: "Đi lên từ giữa lên cao, như khi hỏi lại “hả?”. Gần dấu sắc.", example: { hanzi: "麻", pinyin: "má", meaning: "cây gai" } },
  { tone: 3, mark: "ǎ", name: "Thanh 3", contour: [2, 1, 4], vi: "Xuống thấp rồi lên. Gần dấu hỏi nhưng xuống sâu hơn. Khi nói nhanh, thường chỉ đọc phần thấp (gần dấu nặng kéo dài).", example: { hanzi: "马", pinyin: "mǎ", meaning: "con ngựa" } },
  { tone: 4, mark: "à", name: "Thanh 4", contour: [5, 1], vi: "Rơi mạnh từ cao xuống thấp, ngắn và dứt khoát như ra lệnh. Gần dấu huyền nhưng bắt đầu cao hơn và nhanh hơn nhiều.", example: { hanzi: "骂", pinyin: "mà", meaning: "mắng" } },
  { tone: 0, mark: "a", name: "Thanh nhẹ", contour: [3, 3], vi: "Ngắn, nhẹ, không nhấn, không có dấu. Thường ở trợ từ và âm tiết thứ hai: 吗 ma, 的 de, 爸爸 bàba.", example: { hanzi: "吗", pinyin: "ma", meaning: "(trợ từ hỏi)" } },
] as const;

export const TONE_TIPS = [
  "Thanh 2 và thanh 3 dễ nhầm nhất: thanh 2 đi thẳng lên, thanh 3 phải xuống thấp trước.",
  "Thanh 4 không phải dấu nặng: đọc từ cao rơi xuống, không bị “chặn” ở cuối.",
  "Khi tập, dùng tay vẽ đường thanh trong không khí theo sơ đồ.",
];

export const INITIALS: SoundGroup[] = [
  {
    title: "Âm môi: b · p · m · f",
    items: [
      { sound: "b", hanzi: "八", pinyin: "bā", vi: "như “p” tiếng Việt, không bật hơi" },
      { sound: "p", hanzi: "怕", pinyin: "pà", vi: "“p” bật hơi mạnh", warn: "Để tay trước miệng: p phải thấy hơi phả ra, b thì không." },
      { sound: "m", hanzi: "妈", pinyin: "mā", vi: "như “m”" },
      { sound: "f", hanzi: "飞", pinyin: "fēi", vi: "như “ph”" },
    ],
  },
  {
    title: "Âm đầu lưỡi: d · t · n · l",
    items: [
      { sound: "d", hanzi: "大", pinyin: "dà", vi: "như “t” tiếng Việt, không bật hơi", warn: "Không đọc như “đ” tiếng Việt." },
      { sound: "t", hanzi: "他", pinyin: "tā", vi: "như “th”, bật hơi" },
      { sound: "n", hanzi: "你", pinyin: "nǐ", vi: "như “n”" },
      { sound: "l", hanzi: "来", pinyin: "lái", vi: "như “l”" },
    ],
  },
  {
    title: "Âm cuống lưỡi: g · k · h",
    items: [
      { sound: "g", hanzi: "哥", pinyin: "gē", vi: "như “c/k” tiếng Việt, không bật hơi" },
      { sound: "k", hanzi: "看", pinyin: "kàn", vi: "“k” bật hơi mạnh (gần “kh” nhưng bật hơi)" },
      { sound: "h", hanzi: "好", pinyin: "hǎo", vi: "giữa “h” và “kh”, hơi xát ở cuống lưỡi" },
    ],
  },
  {
    title: "Âm mặt lưỡi: j · q · x",
    note: "Mặt lưỡi áp lên vòm, môi dẹt như cười. Chỉ đi với i, ü.",
    items: [
      { sound: "j", hanzi: "鸡", pinyin: "jī", vi: "như “ch” trong “chi”, không bật hơi" },
      { sound: "q", hanzi: "七", pinyin: "qī", vi: "“ch” bật hơi", warn: "q KHÔNG đọc là “qu” tiếng Việt." },
      { sound: "x", hanzi: "西", pinyin: "xī", vi: "như “x” trong “xi”, nhẹ" },
    ],
  },
  {
    title: "Âm uốn lưỡi: zh · ch · sh · r",
    note: "Đầu lưỡi uốn cong lên chạm (hoặc gần chạm) vòm miệng phía trên.",
    items: [
      { sound: "zh", hanzi: "知", pinyin: "zhī", vi: "như “tr” uốn lưỡi, không bật hơi", warn: "Dễ nhầm với j: zh uốn lưỡi, j thì lưỡi phẳng." },
      { sound: "ch", hanzi: "吃", pinyin: "chī", vi: "“tr” uốn lưỡi, bật hơi", warn: "Dễ nhầm với q." },
      { sound: "sh", hanzi: "是", pinyin: "shì", vi: "như “s” uốn lưỡi (giọng miền Bắc hay đọc thành x — cần uốn lưỡi)", warn: "Dễ nhầm với x." },
      { sound: "r", hanzi: "日", pinyin: "rì", vi: "như “r” uốn lưỡi nhẹ, không rung; không đọc thành “d” hay “z”" },
    ],
  },
  {
    title: "Âm đầu lưỡi trước: z · c · s",
    note: "Đầu lưỡi thẳng, chạm sau răng cửa trên.",
    items: [
      { sound: "z", hanzi: "字", pinyin: "zì", vi: "như “ch” đầu lưỡi (gần “ts”), không bật hơi" },
      { sound: "c", hanzi: "词", pinyin: "cí", vi: "“ts” bật hơi mạnh", warn: "c KHÔNG đọc là “c/k” tiếng Việt." },
      { sound: "s", hanzi: "四", pinyin: "sì", vi: "như “x” tiếng Việt" },
    ],
  },
];

export const FINALS: SoundGroup[] = [
  {
    title: "Vận mẫu đơn",
    items: [
      { sound: "a", hanzi: "他", pinyin: "tā", vi: "như “a”" },
      { sound: "o", hanzi: "波", pinyin: "bō", vi: "như “ô” (hơi có “ua” — bō nghe như “pua”)" },
      { sound: "e", hanzi: "喝", pinyin: "hē", vi: "như “ưa” / “ơ”, không đọc là “e”", warn: "e trong pinyin ≠ e tiếng Việt." },
      { sound: "i", hanzi: "你", pinyin: "nǐ", vi: "như “i”" },
      { sound: "u", hanzi: "不", pinyin: "bù", vi: "như “u”" },
      { sound: "ü", hanzi: "女", pinyin: "nǚ", vi: "như “uy” nhưng tròn môi giữ nguyên (đọc “i” rồi chu môi)" },
    ],
  },
  {
    title: "Vận mẫu kép",
    items: [
      { sound: "ai", hanzi: "爱", pinyin: "ài", vi: "như “ai”" },
      { sound: "ei", hanzi: "飞", pinyin: "fēi", vi: "như “ây”" },
      { sound: "ao", hanzi: "好", pinyin: "hǎo", vi: "như “ao”" },
      { sound: "ou", hanzi: "口", pinyin: "kǒu", vi: "như “âu”" },
    ],
  },
  {
    title: "Vận mẫu mũi",
    note: "-n: đầu lưỡi chạm lợi trên; -ng: cuống lưỡi, âm vang ở mũi.",
    items: [
      { sound: "an", hanzi: "看", pinyin: "kàn", vi: "như “an”" },
      { sound: "en", hanzi: "人", pinyin: "rén", vi: "như “ân”" },
      { sound: "ang", hanzi: "忙", pinyin: "máng", vi: "như “ang”" },
      { sound: "eng", hanzi: "冷", pinyin: "lěng", vi: "như “âng”" },
      { sound: "ong", hanzi: "东", pinyin: "dōng", vi: "như “ung”", warn: "ong đọc là “ung”, không phải “ong”." },
    ],
  },
  {
    title: "Nhóm bắt đầu bằng i",
    items: [
      { sound: "ia", hanzi: "家", pinyin: "jiā", vi: "như “i-a” đọc liền" },
      { sound: "ie", hanzi: "谢", pinyin: "xiè", vi: "như “iê”" },
      { sound: "iao", hanzi: "小", pinyin: "xiǎo", vi: "như “i-ao” đọc liền (gần “eo”)" },
      { sound: "iu (iou)", hanzi: "六", pinyin: "liù", vi: "như “iêu”" },
      { sound: "ian", hanzi: "天", pinyin: "tiān", vi: "như “iên”", warn: "ian đọc là “iên”, không phải “i-an”." },
      { sound: "in", hanzi: "今", pinyin: "jīn", vi: "như “in”" },
      { sound: "iang", hanzi: "想", pinyin: "xiǎng", vi: "như “i-ang” đọc liền" },
      { sound: "ing", hanzi: "明", pinyin: "míng", vi: "như “inh”" },
      { sound: "iong", hanzi: "用", pinyin: "yòng", vi: "như “i-ung” đọc liền" },
    ],
  },
  {
    title: "Nhóm bắt đầu bằng u",
    items: [
      { sound: "ua", hanzi: "花", pinyin: "huā", vi: "như “oa”" },
      { sound: "uo", hanzi: "多", pinyin: "duō", vi: "như “uô”" },
      { sound: "uai", hanzi: "快", pinyin: "kuài", vi: "như “oai”" },
      { sound: "ui (uei)", hanzi: "对", pinyin: "duì", vi: "như “uây”" },
      { sound: "uan", hanzi: "关", pinyin: "guān", vi: "như “oan”" },
      { sound: "un (uen)", hanzi: "春", pinyin: "chūn", vi: "như “uân”" },
      { sound: "uang", hanzi: "忘", pinyin: "wàng", vi: "như “oang”" },
    ],
  },
  {
    title: "Nhóm bắt đầu bằng ü",
    items: [
      { sound: "üe", hanzi: "学", pinyin: "xué", vi: "như “uê” tròn môi (gần “uyê”)" },
      { sound: "üan", hanzi: "远", pinyin: "yuǎn", vi: "như “uyên”" },
      { sound: "ün", hanzi: "云", pinyin: "yún", vi: "như “uyn”" },
    ],
  },
  {
    title: "Trường hợp đặc biệt",
    items: [
      { sound: "er", hanzi: "二", pinyin: "èr", vi: "“ơ” rồi uốn lưỡi lên" },
      { sound: "-i (sau z c s)", hanzi: "字", pinyin: "zì", vi: "i ở đây đọc là “ư”", warn: "zi, ci, si đọc “chư, tsư, xư” — không đọc “i”." },
      { sound: "-i (sau zh ch sh r)", hanzi: "是", pinyin: "shì", vi: "i ở đây đọc là “ư” uốn lưỡi", warn: "zhi, chi, shi, ri — i đọc “ư”." },
    ],
  },
];

export const SPELLING_RULES: Array<{ rule: string; examples: string }> = [
  { rule: "Âm tiết bắt đầu bằng i: viết y (i → yi, ia → ya, ie → ye, iao → yao, iou → you, ian → yan, in → yin, ing → ying…).", examples: "一 yī · 有 yǒu · 也 yě" },
  { rule: "Âm tiết bắt đầu bằng u: viết w (u → wu, ua → wa, uo → wo, uei → wei, uen → wen, uang → wang…).", examples: "五 wǔ · 我 wǒ · 问 wèn" },
  { rule: "Âm tiết bắt đầu bằng ü: viết yu (ü → yu, üe → yue, üan → yuan, ün → yun).", examples: "鱼 yú · 月 yuè · 远 yuǎn" },
  { rule: "Sau j, q, x, y: ü viết thành u (bỏ hai chấm) nhưng VẪN đọc ü. Sau n, l thì giữ ü để phân biệt.", examples: "去 qù (đọc qǜ) · 女 nǚ ≠ 努 nǔ" },
  { rule: "Sau thanh mẫu, iou → iu, uei → ui, uen → un.", examples: "六 liù · 对 duì · 春 chūn" },
  { rule: "Dấu thanh đặt trên a; không có a thì trên o hoặc e; với iu, ui đặt trên chữ đứng sau. Chữ i có dấu thì bỏ chấm.", examples: "好 hǎo · 多 duō · 六 liù · 对 duì · 你 nǐ" },
  { rule: "Thanh nhẹ không có dấu.", examples: "吗 ma · 的 de · 爸爸 bàba" },
  { rule: "Dấu cách âm ' khi âm tiết sau bắt đầu bằng a, o, e, để không đọc dính.", examples: "西安 Xī'ān (hai âm tiết, không phải “xiān”)" },
];

export const TONE_SANDHI: Array<{ title: string; rule: string; examples: Array<{ hanzi: string; written: string; spoken: string }> }> = [
  {
    title: "Hai thanh 3 đi liền nhau",
    rule: "Thanh 3 đứng trước một thanh 3 khác thì đọc thành thanh 2. Pinyin vẫn viết thanh 3.",
    examples: [
      { hanzi: "你好", written: "nǐ hǎo", spoken: "ní hǎo" },
      { hanzi: "很好", written: "hěn hǎo", spoken: "hén hǎo" },
      { hanzi: "可以", written: "kěyǐ", spoken: "kéyǐ" },
    ],
  },
  {
    title: "不 bù",
    rule: "不 đứng trước thanh 4 thì đọc thanh 2 (bú). Trước các thanh khác giữ bù.",
    examples: [
      { hanzi: "不是", written: "bù shì", spoken: "bú shì" },
      { hanzi: "不去", written: "bù qù", spoken: "bú qù" },
      { hanzi: "不忙", written: "bù máng", spoken: "bù máng" },
    ],
  },
  {
    title: "一 yī",
    rule: "Đếm, đứng một mình, số thứ tự: yī. Trước thanh 4: yí. Trước thanh 1, 2, 3: yì.",
    examples: [
      { hanzi: "一个", written: "yī ge", spoken: "yí ge" },
      { hanzi: "一天", written: "yī tiān", spoken: "yì tiān" },
      { hanzi: "一起", written: "yīqǐ", spoken: "yìqǐ" },
    ],
  },
];

export const BASIC_STROKES: Array<{ name: string; pinyin: string; vi: string; example: string }> = [
  { name: "横", pinyin: "héng", vi: "Ngang — viết từ trái sang phải", example: "一" },
  { name: "竖", pinyin: "shù", vi: "Sổ — viết từ trên xuống", example: "十" },
  { name: "撇", pinyin: "piě", vi: "Phẩy — kéo chéo xuống bên trái", example: "人" },
  { name: "点", pinyin: "diǎn", vi: "Chấm — nét ngắn chéo xuống phải", example: "六" },
  { name: "捺", pinyin: "nà", vi: "Mác — kéo chéo xuống bên phải, cuối nét loe ra", example: "八" },
  { name: "提", pinyin: "tí", vi: "Hất — hất chéo lên bên phải", example: "我" },
  { name: "折", pinyin: "zhé", vi: "Gập — đổi hướng giữa chừng", example: "口" },
  { name: "钩", pinyin: "gōu", vi: "Móc — cuối nét móc lên", example: "小" },
];

export const STROKE_ORDER_RULES: Array<{ rule: string; hanzi: string }> = [
  { rule: "Ngang trước, sổ sau", hanzi: "十" },
  { rule: "Phẩy trước, mác sau", hanzi: "人" },
  { rule: "Trên trước, dưới sau", hanzi: "三" },
  { rule: "Trái trước, phải sau", hanzi: "你" },
  { rule: "Giữa trước, hai bên sau", hanzi: "小" },
  { rule: "Ngoài trước, trong sau", hanzi: "月" },
  { rule: "Vào nhà trước, đóng cửa sau", hanzi: "日" },
];

/** Groups of syllables that Vietnamese learners confuse; each is heard and picked in the practice. */
export const CONFUSABLE_SETS: SoundItem[][] = [
  [
    { sound: "zhī", hanzi: "知", pinyin: "zhī", vi: "" },
    { sound: "jī", hanzi: "鸡", pinyin: "jī", vi: "" },
    { sound: "zī", hanzi: "资", pinyin: "zī", vi: "" },
  ],
  [
    { sound: "chū", hanzi: "出", pinyin: "chū", vi: "" },
    { sound: "qū", hanzi: "区", pinyin: "qū", vi: "" },
    { sound: "cū", hanzi: "粗", pinyin: "cū", vi: "" },
  ],
  [
    { sound: "shī", hanzi: "师", pinyin: "shī", vi: "" },
    { sound: "xī", hanzi: "西", pinyin: "xī", vi: "" },
    { sound: "sī", hanzi: "丝", pinyin: "sī", vi: "" },
  ],
  [
    { sound: "bā", hanzi: "八", pinyin: "bā", vi: "" },
    { sound: "pā", hanzi: "趴", pinyin: "pā", vi: "" },
  ],
  [
    { sound: "dā", hanzi: "搭", pinyin: "dā", vi: "" },
    { sound: "tā", hanzi: "他", pinyin: "tā", vi: "" },
  ],
  [
    { sound: "gē", hanzi: "哥", pinyin: "gē", vi: "" },
    { sound: "kē", hanzi: "科", pinyin: "kē", vi: "" },
  ],
  [
    { sound: "nǚ", hanzi: "女", pinyin: "nǚ", vi: "" },
    { sound: "nǔ", hanzi: "努", pinyin: "nǔ", vi: "" },
  ],
  [
    { sound: "tiān", hanzi: "天", pinyin: "tiān", vi: "" },
    { sound: "tān", hanzi: "摊", pinyin: "tān", vi: "" },
  ],
  [
    { sound: "hē", hanzi: "喝", pinyin: "hē", vi: "" },
    { sound: "hā", hanzi: "哈", pinyin: "hā", vi: "" },
  ],
];
