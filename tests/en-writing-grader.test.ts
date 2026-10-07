import { describe, expect, it, vi } from "vitest";
import {
  criteriaFor,
  geminiRequest,
  grade,
  GeminiError,
  locateErrors,
  normaliseResult,
  overallBand,
  resultSchema,
  type GradeInput,
} from "../supabase/functions/grade-writing/grader";

const input: GradeInput = {
  kind: "paragraph",
  lesson: { number: 18, title: "Mua sắm", grammar: "a / an / the" },
  prompt_vi: "Viết đoạn văn 60–80 từ về bản thân.",
  prompt_en: "Write about yourself.",
  words: { min: 60, max: 80 },
  text: "my name is Lan. i am a students.",
  syllabus: [{ n: 1, grammar: "to be" }, { n: 18, grammar: "a / an / the" }],
};

const good = {
  criteria: [
    { code: "TR", band: 4.5, comment_vi: "a" },
    { code: "CC", band: 4, comment_vi: "b" },
    { code: "LR", band: 4, comment_vi: "c" },
    { code: "GRA", band: 4, comment_vi: "d" },
  ],
  summary_vi: "Tốt",
  errors: [
    { wrong: "i am", right: "I am", why_vi: "Viết hoa I", type: "punctuation", personal: "capital-i", lesson: 1 },
    { wrong: "a students", right: "a student", why_vi: "a + số ít", type: "grammar", personal: "plural-s", lesson: 42 },
    { wrong: "same", right: "same", why_vi: "không phải lỗi", type: "grammar", personal: "none", lesson: 0 },
    { wrong: "Lan", right: "Lan.", why_vi: "x", type: "weird", personal: "none", lesson: 0 },
  ],
  corrected: "My name is Lan. I am a student.",
  weakest_vi: "GRA",
  actions_vi: ["1", "2", "3", "4"],
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(status === 200 ? { candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] } : body), { status });

describe("writing grader", () => {
  it("rounds the overall band like IELTS", () => {
    expect(overallBand([6, 6, 6, 6.5])).toBe(6); // 6.125
    expect(overallBand([6, 6, 6.5, 6.5])).toBe(6.5); // 6.25
    expect(overallBand([6.5, 6.5, 6.5, 6])).toBe(6.5); // 6.375
    expect(overallBand([7, 7, 7, 6.5])).toBe(7); // 6.875 → 7
    expect(overallBand([6.5, 6.5, 7, 7])).toBe(7); // 6.75 → 7
    expect(overallBand([])).toBe(0);
  });

  it("uses the criteria of each homework kind", () => {
    expect(criteriaFor("task1")).toEqual(["TA", "CC", "LR", "GRA"]);
    expect(criteriaFor("speaking")).toEqual(["FC", "LR", "GRA"]);
    const schema = resultSchema("speaking");
    expect(schema.properties.criteria.items.properties.code.description).toBe("one of: FC, LR, GRA");
    // Gemini answers 400 to `enum`, and to item/number limits once the schema is this big
    for (const k of ["enum", "minItems", "maxItems", "minimum", "maximum"]) expect(JSON.stringify(schema)).not.toContain(`"${k}"`);
  });

  it("builds a Gemini request with the essay fenced as data and a JSON schema", () => {
    const req = geminiRequest(input);
    const text = req.contents[0]!.parts[0]!.text;
    expect(text).toContain("Buổi 18");
    expect(text).toContain("<<<\nmy name is Lan. i am a students.\n>>>");
    expect(text).toContain("18: a / an / the");
    expect(text).toContain("Số từ thực tế: 8.");
    expect(req.generationConfig.responseMimeType).toBe("application/json");
    expect(req.generationConfig.responseJsonSchema.required).toContain("corrected");
  });

  it("cleans the model result", () => {
    const r = normaliseResult(good, input);
    expect(r.overall).toBe(4); // 4.125
    expect(r.errors).toHaveLength(3); // "same → same" dropped
    expect(r.errors[0]).toMatchObject({ personal: "capital-i", lesson: 1 });
    expect(r.errors[1]!.lesson).toBeNull(); // Buổi 42 not taught yet at Buổi 18
    expect(r.errors[2]).toMatchObject({ type: "grammar", personal: null, lesson: null });
    expect(r.actions_vi).toHaveLength(4); // 3–5 allowed
    expect(r.word_count).toBe(8);
  });

  it("clamps bands and rejects results missing a criterion or the corrected text", () => {
    const wild = { ...good, criteria: good.criteria.map((c) => ({ ...c, band: c.code === "TR" ? 11 : 4.3 })) };
    expect(normaliseResult(wild, input).criteria.map((c) => c.band)).toEqual([9, 4.5, 4.5, 4.5]);
    expect(() => normaliseResult({ ...good, criteria: good.criteria.slice(1) }, input)).toThrow(/TR/);
    expect(() => normaliseResult({ ...good, corrected: "" }, input)).toThrow(/corrected/);
  });

  it("keeps the coaching parts and fixes the next-band target", () => {
    const r = normaliseResult(
      {
        ...good,
        upgrades: [
          { original: "It is important.", better: "It is essential.", changes: [{ from: "important", to: "essential", why_vi: "tránh từ phổ thông" }, { from: "", to: "x", why_vi: "" }] },
          { original: "", better: "x", changes: [] },
        ],
        vocabulary: Array.from({ length: 7 }, (_, i) => ({ phrase: `p${i}`, meaning_vi: "nghĩa", example: "e", replaces: i ? "" : "important" })),
        strengths: [{ type: "linking", quote: "However,", note_vi: "từ nối đúng" }, { type: "other", quote: "x", note_vi: "y" }],
        next_band: {
          target: 8,
          steps: [
            { criterion: "gra", action_vi: "Dùng câu phức", before: "I am a students.", after: "I am a student who loves English." },
            { criterion: "XX", action_vi: "Thêm ý", before: "", after: "My brother is…" },
            { criterion: "LR", action_vi: "", before: "", after: "" },
          ],
          structures: [{ structure: "Although + clause", use_vi: "nhượng bộ", example: "Although I am busy, …" }, { structure: "", use_vi: "x", example: "y" }],
        },
        checklist: [{ point_vi: "Tên", done: true, note_vi: "Lan" }, { point_vi: "Tuổi", done: "yes", note_vi: "thiếu" }, { point_vi: "", done: true }],
        sample: "Sample answer.",
      },
      input,
    );
    expect(r.upgrades).toHaveLength(1);
    expect(r.upgrades[0]!.changes).toEqual([{ from: "important", to: "essential", why_vi: "tránh từ phổ thông" }]);
    expect(r.vocabulary).toHaveLength(5);
    expect(r.vocabulary[0]!.replaces).toBe("important");
    expect(r.strengths.map((s) => s.type)).toEqual(["linking", "vocabulary"]);
    expect(r.next_band.target).toBe(5); // overall 4 + 1, not the model's 8
    expect(r.next_band.steps.map((s) => s.criterion)).toEqual(["GRA", null]); // empty action dropped, unknown code → null
    expect(r.next_band.structures).toHaveLength(1);
    expect(r.checklist).toEqual([
      { point_vi: "Tên", done: true, note_vi: "Lan" },
      { point_vi: "Tuổi", done: false, note_vi: "thiếu" }, // only a real `true` counts as done
    ]);
    expect(r.sample).toBe("Sample answer.");
    // an older/partial answer still renders
    expect(normaliseResult(good, input)).toMatchObject({ checklist: [], upgrades: [], vocabulary: [], strengths: [], sample: "", next_band: { steps: [], structures: [] } });
  });

  it("keeps per-criterion evidence", () => {
    const r = normaliseResult(
      {
        ...good,
        criteria: good.criteria.map((c) => ({
          ...c,
          descriptor_vi: "mô tả",
          good: [{ point_vi: "Dùng to be đúng", quote: "I am" }, { point_vi: "", quote: "x" }],
          bad: [{ point_vi: "Thiếu câu kết", quote: "" }],
          next_vi: "Thêm câu kết",
        })),
      },
      input,
    );
    expect(r.criteria[0]).toMatchObject({ descriptor_vi: "mô tả", good: [{ point_vi: "Dùng to be đúng", quote: "I am" }], bad: [{ point_vi: "Thiếu câu kết", quote: "" }], next_vi: "Thêm câu kết" });
    expect(normaliseResult(good, input).criteria[0]).toMatchObject({ descriptor_vi: "", good: [], bad: [], next_vi: "" });
  });

  it("locates errors in the text for highlighting", () => {
    const text = "i am a students. i like cat.";
    const spans = locateErrors(text, [{ wrong: "i am" }, { wrong: "a students" }, { wrong: "not there" }, { wrong: "i like" }, { wrong: "am a" }]);
    expect(spans.map((s) => [text.slice(s.start, s.end), s.index])).toEqual([
      ["i am", 0],
      ["a students", 1],
      ["i like", 3],
    ]); // "not there" is missing, "am a" overlaps → not highlighted
  });

  it("falls back to the next model when the free tier is exhausted", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(reply({ error: "quota" }, 429)).mockResolvedValueOnce(reply(good));
    const { model, result } = await grade(input, ["m1", "m2"], "k", fetchFn as unknown as typeof fetch);
    expect(model).toBe("m2");
    expect(result.overall).toBe(4);
    expect(fetchFn.mock.calls[0]![0]).toContain("/models/m1:generateContent");
    expect(fetchFn.mock.calls[0]![1].headers["x-goog-api-key"]).toBe("k");
  });

  it("does not retry a bad key", async () => {
    const fetchFn = vi.fn().mockResolvedValue(reply({ error: "bad key" }, 400));
    await expect(grade(input, ["m1", "m2"], "k", fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(GeminiError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("ignores thought parts and reports non-JSON answers", async () => {
    const thought = new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "thinking…", thought: true }, { text: JSON.stringify(good) }] } }] }),
    );
    expect((await grade(input, ["m"], "k", vi.fn().mockResolvedValue(thought) as unknown as typeof fetch)).result.overall).toBe(4);
    const junk = new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{\"crit" }] } }] }));
    await expect(grade(input, ["m"], "k", vi.fn().mockResolvedValue(junk) as unknown as typeof fetch)).rejects.toThrow(/MAX_TOKENS/);
  });
});
