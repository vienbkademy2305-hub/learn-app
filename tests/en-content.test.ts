import { describe, expect, it } from "vitest";
import { fold, loadEnglish, searchEnglish, validateEnglish, type EnglishData } from "../importers/en/load";

const data = loadEnglish();
const broken = (mutate: (d: EnglishData) => void) => {
  const copy = structuredClone(data);
  mutate(copy);
  return validateEnglish(copy).errors.join("\n");
};

describe("English data (data/en)", () => {
  it("the committed data has no errors", () => {
    expect(validateEnglish(data).errors).toEqual([]);
    expect(data.lessons.length).toBeGreaterThan(0);
  });

  it("rejects content from sources that are not publishable", () => {
    expect(broken((d) => (d.sentences[0]!.source = "egiu"))).toMatch(/source egiu is not publishable/);
  });

  it("rejects broken references and duplicate ids", () => {
    expect(broken((d) => d.sentences[0]!.words!.push("nope|n"))).toMatch(/unknown word nope\|n/);
    expect(broken((d) => d.lexicon.push({ ...d.lexicon[0]! }))).toMatch(/duplicate lexicon id/);
    expect(broken((d) => (d.grammar[0]!.examples = ["b99-001"]))).toMatch(/unknown sentence b99-001/);
  });

  it("checks exercise answers", () => {
    const exercises = (d: EnglishData) => d.lessons[0]!.steps.find((s) => s.type === "exercises")! as { items: Array<Record<string, any>> };
    expect(broken((d) => (exercises(d).items.find((e) => e.kind === "tfng")!.questions[0].answer = "False"))).toMatch(/answer must be T\/F\/NG/);
    expect(broken((d) => (exercises(d).items.find((e) => e.kind === "mcq")!.questions[0].answer = "e"))).toMatch(/mcq answer/);
    expect(broken((d) => (exercises(d).items.find((e) => e.kind === "gap-fill")!.questions[0].answer = "divorced"))).toMatch(/not in the word bank/);
  });

  it("searches without case or Vietnamese diacritics", () => {
    expect(fold("Gia Đình")).toBe("gia dinh");
    const hits = searchEnglish(data, "doc than");
    expect(hits.some((h) => h.id === "single|adj")).toBe(true);
  });
});
