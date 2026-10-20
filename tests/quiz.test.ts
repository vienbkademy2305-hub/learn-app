import { describe, expect, it } from "vitest";
import { clock, percentOf, starsFor } from "@/domain/quiz";

describe("quiz scoring", () => {
  it("gives 1–3 stars by accuracy", () => {
    expect(starsFor(0, 3)).toBe(1);
    expect(starsFor(1, 3)).toBe(1);
    expect(starsFor(2, 3)).toBe(2);
    expect(starsFor(17, 20)).toBe(3);
    expect(starsFor(0, 0)).toBe(1);
  });
  it("rounds percent and formats the clock", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBe(0);
    expect(clock(289)).toBe("04:49");
    expect(clock(5)).toBe("00:05");
    expect(clock(-3)).toBe("00:00");
  });
});
