import { describe, expect, it } from "vitest";
import { chat, geminiRequest, normaliseReply, parseChatInput } from "../supabase/functions/chat-ai/chat";
import { scenarioById, SCENARIOS, LEVELS } from "../supabase/functions/chat-ai/scenarios";

const cafe = scenarioById("en-cafe")!;
const good = {
  reply: "Sure! What size would you like?",
  reply_vi: "Chắc chắn rồi! Bạn muốn cỡ nào?",
  pinyin: "ignored for English",
  feedback: { fixed: "I would like a coffee.", notes: [{ wrong: "I want coffee", right: "I would like a coffee", why_vi: "Lịch sự hơn." }, { wrong: "not in the text", right: "x", why_vi: "y" }], praise_vi: "Tốt!" },
  suggestions: ["A small one, please.", "Medium.", "What sizes do you have?", "extra fourth"],
};
const reply = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
const ok = (data: unknown) => reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] });

describe("scenarios", () => {
  it("every scenario has a unique id, an opening and a level list", () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      expect(s.opening.length).toBeGreaterThan(5);
      expect(LEVELS[s.lang].length).toBeGreaterThan(0);
    }
  });
});

describe("parseChatInput", () => {
  it("accepts an opening call with no turns", () => {
    expect(parseChatInput({ scenario: "en-cafe", level: "B1", turns: [] })).toMatchObject({ level: "B1", turns: [] });
  });
  it("rejects unknown scenarios and a transcript that ends with the AI", () => {
    expect(parseChatInput({ scenario: "nope", turns: [] })).toBeNull();
    expect(parseChatInput({ scenario: "en-cafe", turns: [{ role: "ai", text: "Hi" }] })).toBeNull();
  });
  it("falls back to the middle level and caps the transcript", () => {
    const turns = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? "user" : "ai", text: `m${i}` }));
    const p = parseChatInput({ scenario: "zh-food", level: "??", turns })!;
    expect(p.level).toBe("HSK2");
    expect(p.turns.length).toBeLessThanOrEqual(30);
  });
});

describe("request", () => {
  it("starts with a user turn even when the AI spoke first", () => {
    const input = parseChatInput({ scenario: "en-cafe", turns: [{ role: "ai", text: "Hi!" }, { role: "user", text: "Hello" }] })!;
    const c = geminiRequest(input).contents;
    expect(c.map((x) => x.role)).toEqual(["user", "model", "user"]);
  });
  it("tells the model to use the fixed opening line on the first turn", () => {
    const input = parseChatInput({ scenario: "en-cafe", turns: [] })!;
    expect(geminiRequest(input).systemInstruction.parts[0]!.text).toContain(cafe.opening);
  });
});

describe("normaliseReply", () => {
  const input = parseChatInput({ scenario: "en-cafe", level: "A2", turns: [{ role: "ai", text: "Hi" }, { role: "user", text: "I want coffee" }] })!;
  it("keeps only notes that quote the learner's message, caps suggestions, drops pinyin for English", () => {
    const r = normaliseReply(good, input);
    expect(r.feedback.notes).toHaveLength(1);
    expect(r.suggestions).toHaveLength(3);
    expect(r.pinyin).toBe("");
  });
  it("throws without a reply", () => {
    expect(() => normaliseReply({ feedback: {} }, input)).toThrow();
  });
  it("opening turn has no feedback", () => {
    const opening = parseChatInput({ scenario: "en-cafe", turns: [] })!;
    expect(normaliseReply(good, opening).feedback).toEqual({ fixed: "", notes: [], praise_vi: "" });
  });
});

describe("chat()", () => {
  const input = parseChatInput({ scenario: "zh-food", level: "HSK1", turns: [{ role: "ai", text: "欢迎" }, { role: "user", text: "我想吃面" }] })!;
  const zh = { ...good, reply: "好的！", pinyin: "hǎo de", feedback: { fixed: "", notes: [], praise_vi: "Đúng rồi" } };
  it("falls through to the next model when the first is busy", async () => {
    let n = 0;
    const f = (async (url: string) => (n++ === 0 ? new Response("busy", { status: 429 }) : await ok(zh)())) as unknown as typeof fetch;
    const r = await chat(input, ["a", "b"], "k", f);
    expect(r.model).toBe("b");
    expect(r.result.pinyin).toBe("hǎo de");
  });
  it("does not retry a non-retryable error", async () => {
    let n = 0;
    const f = (async () => (n++, new Response("bad", { status: 400 }))) as unknown as typeof fetch;
    await expect(chat(input, ["a", "b"], "k", f)).rejects.toThrow();
    expect(n).toBe(1);
  });
});

describe("Săn từ", () => {
  it("parses at most 5 distinct targets", () => {
    const p = parseChatInput({ scenario: "en-cafe", turns: [], targets: ["a", "a", "bb", "c", "d", "e", "f", ""] })!;
    expect(p.targets).toEqual(["a", "bb", "c", "d", "e"]);
  });
  it("adds the targets to the prompt", () => {
    const p = parseChatInput({ scenario: "en-cafe", turns: [], targets: ["receipt"] })!;
    expect(geminiRequest(p).systemInstruction.parts[0]!.text).toContain('"receipt"');
  });
  it("keeps a claimed target only when the message really contains it", async () => {
    const { usedTargets } = await import("../supabase/functions/chat-ai/chat");
    expect(usedTargets(["receipt", "menu"], ["receipt", "menu", "bill"], "Can I have the receipt?", "en")).toEqual(["receipt"]);
    expect(usedTargets(["going"], ["go"], "I am going home", "en")).toEqual([]); // not claimed by that exact form
    expect(usedTargets(["go"], ["go"], "I am going home", "en")).toEqual(["go"]);
    expect(usedTargets(["你好"], ["你好", "再见"], "你好，我叫河", "zh")).toEqual(["你好"]);
    expect(usedTargets(["再见"], ["再见"], "你好", "zh")).toEqual([]);
  });
});
