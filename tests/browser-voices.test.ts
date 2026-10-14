import { describe, expect, it } from "vitest";
import { isNaturalVoice, rankVoices } from "@/features/audio/browser-voices";

const v = (name: string, lang: string, localService = true) => ({ name, lang, localService });

describe("rankVoices", () => {
  it("puts Edge natural Mandarin voices before the old Windows ones and drops Cantonese/Taiwan", () => {
    const list = [
      v("Microsoft Huihui - Chinese (Simplified, PRC)", "zh-CN"),
      v("Microsoft Kangkang - Chinese (Simplified, PRC)", "zh-CN"),
      v("Microsoft HiuGaai Online (Natural) - Chinese (Cantonese Traditional)", "zh-HK", false),
      v("Microsoft HsiaoChen Online (Natural) - Chinese (Taiwan)", "zh-TW", false),
      v("Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)", "zh-CN", false),
      v("Microsoft Zira - English (United States)", "en-US"),
    ];
    const ranked = rankVoices(list, "zh").map((x) => x.name);
    expect(ranked[0]).toMatch(/Xiaoxiao/);
    expect(ranked).toHaveLength(3);
    expect(ranked.some((n) => /HiuGaai|HsiaoChen/.test(n))).toBe(false);
  });

  it("prefers Chrome's Google voice and British English", () => {
    const list = [v("Microsoft Hazel - English (United Kingdom)", "en-GB"), v("Google US English", "en-US", false), v("Google UK English Female", "en-GB", false)];
    expect(rankVoices(list, "en").map((x) => x.name)).toEqual(["Google UK English Female", "Google US English", "Microsoft Hazel - English (United Kingdom)"]);
  });

  it("treats Android-style names and Chrome's Google 普通话 sensibly", () => {
    expect(rankVoices([v("Google 普通话（中国大陆）", "zh-CN", false), v("Microsoft Huihui", "zh-CN")], "zh")[0]!.name).toMatch(/Google/);
    expect(isNaturalVoice(v("Microsoft Hazel - English (United Kingdom)", "en-GB"), "en")).toBe(false);
    expect(isNaturalVoice(v("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB", false), "en")).toBe(true);
  });
});
