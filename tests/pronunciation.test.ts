import { describe, expect, it } from "vitest";
import { CONFUSABLE_SETS, FINALS, INITIALS, TONES } from "../src/content/pronunciation";
import { seededRng } from "../src/domain/exercises";
import { buildSoundQuiz, buildToneQuiz, tonePool } from "../src/domain/pronunciation";

describe("tonePool", () => {
  it("keeps single characters with one reading and a full tone", () => {
    const pool = tonePool([
      { slug: "ma1-5988", simplified: "妈" },
      { slug: "nv3-5973", simplified: "女" },
      { slug: "ma5-5417", simplified: "吗" }, // neutral tone
      { slug: "le5-4e86", simplified: "了" }, // polyphone
      { slug: "hao3-597d", simplified: "好" }, // polyphone list
      { slug: "zhong1-4e2d", simplified: "中" },
      { slug: "lao3shi1-8001-5e08", simplified: "老师" }, // two characters
      { slug: "yao4-8981", simplified: "要" },
      { slug: "yao1-8981", simplified: "要" }, // same character, two readings
    ]);
    expect(pool).toEqual([
      { hanzi: "妈", base: "ma", tone: 1 },
      { hanzi: "女", base: "nv", tone: 3 },
    ]);
  });
});

describe("listening quizzes", () => {
  it("offers the four tones of the syllable, one correct", () => {
    const [q] = buildToneQuiz([{ hanzi: "女", base: "nv", tone: 3 }], seededRng(1));
    expect(q!.choices.map((c) => c.text)).toEqual(["nǖ", "nǘ", "nǚ", "nǜ"]);
    expect(q!.choices.find((c) => c.correct)!.text).toBe("nǚ");
    expect(q!.answer).toBe("nǚ");
  });

  it("asks about every confusable set, the answer being one of its members", () => {
    const qs = buildSoundQuiz(CONFUSABLE_SETS, seededRng(2), 20);
    expect(qs).toHaveLength(20);
    for (const q of qs) {
      expect(q.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(q.choices.find((c) => c.correct)!.text).toBe(q.answer);
    }
  });
});

describe("lesson 0 content", () => {
  it("covers the 21 initials and the 4 tones + neutral", () => {
    expect(INITIALS.flatMap((g) => g.items.map((i) => i.sound)).sort()).toEqual(
      ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s"].sort(),
    );
    expect(TONES.map((t) => t.tone)).toEqual([1, 2, 3, 4, 0]);
  });

  it("gives every sound a single-character example", () => {
    for (const item of [...INITIALS, ...FINALS].flatMap((g) => g.items)) expect([...item.hanzi]).toHaveLength(1);
  });
});
