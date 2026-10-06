import { describe, expect, it } from "vitest";
import * as server from "../supabase/functions/tts/key";
import { castSpeakers, splitDialogue } from "../src/domain/tts-cast";
import * as browser from "../src/features/tts/key";

describe("TTS cache key", () => {
  it("is the same in the browser and in the Edge Function", async () => {
    for (const [voice, text] of [
      ["google:en-GB-Neural2-C", "Good morning."],
      ["google:en-US-Neural2-D", "  Two   spaces\nand a line break "],
      ["google:cmn-CN-Wavenet-A", "你好，我是学生。"],
    ] as const) {
      expect(await browser.ttsKey(voice, text)).toBe(await server.ttsKey(voice, text));
      expect(browser.ttsPath("abc")).toBe(server.ttsPath("abc"));
    }
  });

  it("ignores extra whitespace but not wording or voice", async () => {
    const k = await browser.ttsKey("v", "Hello  world");
    expect(await browser.ttsKey("v", " Hello world ")).toBe(k);
    expect(await browser.ttsKey("v", "Hello world!")).not.toBe(k);
    expect(await browser.ttsKey("w", "Hello world")).not.toBe(k);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("TTS dialogue casting", () => {
  const gender = (id: string) => ({ F: "female", M: "male" })[id];
  it("gives women the female voice and men the male voice, whichever is main", () => {
    const turns = splitDialogue("Man: Hi.\nWoman: Hello.\nMan: Bye.")!;
    expect(turns).toHaveLength(3);
    const cast = castSpeakers(turns.map((t) => t.speaker), "F", "M", gender);
    expect(cast.get("Woman")).toBe("F");
    expect(cast.get("Man")).toBe("M");
    expect(castSpeakers(["Woman", "Man"], "M", "F", gender).get("Woman")).toBe("F");
  });

  it("alternates unknown speakers and uses one voice when there is no second voice", () => {
    const cast = castSpeakers(["Examiner", "Candidate"], "F", "M", gender);
    expect(new Set(cast.values()).size).toBe(2);
    expect([...castSpeakers(["Examiner", "Candidate"], "F", "recorded", gender).values()]).toEqual(["F", "F"]);
  });

  it("does not treat plain text as a dialogue", () => {
    expect(splitDialogue("Today we will talk about salt.")).toBeNull();
  });
});
