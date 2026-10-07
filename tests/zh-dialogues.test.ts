import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { zhDialogues } from "@/content/zh-dialogues";
import { splitPinyin } from "@/domain/spelling";

const lessons = (JSON.parse(readFileSync(path.join(process.cwd(), ".data", "content", "hsk1.json"), "utf8")) as { lessons: Array<{ slug: string }> }).lessons;

/** Syllables in a pinyin string: vowel groups ("xuésheng" → 2). */
const syllables = (py: string) => (splitPinyin(py.replace(/[^\p{L}\s]/gu, " ")).letters ? py.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").match(/[aeiouv]+/g)?.length ?? 0 : 0);

describe("HSK1 role-play dialogues", () => {
  const all = zhDialogues();
  it("every lesson has a two-person dialogue", () => {
    for (const l of lessons) {
      const lines = all[l.slug] ?? [];
      expect(lines.length, l.slug).toBeGreaterThanOrEqual(6);
      expect(new Set(lines.map((x) => x.speaker)).size, l.slug).toBe(2);
    }
  });
  it("no unknown lesson slugs", () => {
    for (const slug of Object.keys(all)) expect(lessons.some((l) => l.slug === slug), slug).toBe(true);
  });
  it("pinyin has one syllable per character", () => {
    for (const [slug, lines] of Object.entries(all))
      for (const l of lines) {
        const han = [...l.text].filter((c) => /\p{Script=Han}/u.test(c)).length;
        // 儿化 (哪儿, 有点儿) is written as an -r ending, not a separate syllable
        const er = (l.text.match(/儿/g) ?? []).length;
        expect(syllables(l.pinyin), `${slug}: ${l.text} / ${l.pinyin}`).toBe(han - er);
      }
  });
});
