import { describe, expect, it } from "vitest";
import { levelForXp, nextStreak, xpForAttempt, xpForRepeat } from "./logic";
import { parseModelJson, reviewSchema } from "@/lib/ai/schemas";

describe("game calculations", () => {
  it("calculates attempt XP and caps repeat rewards at the best score delta", () => {
    expect(xpForAttempt(75, 2)).toBe(15);
    expect(xpForRepeat(80, 2, 70)).toBe(2);
    expect(xpForRepeat(60, 2, 70)).toBe(0);
  });

  it("derives level from total XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
  });

  it("calculates UTC-day streak changes", () => {
    expect(nextStreak(null, "2026-01-02")).toBe(1);
    expect(nextStreak("2026-01-02", "2026-01-02")).toBeNull();
    expect(nextStreak("2026-01-01", "2026-01-02")).toBe("increment");
    expect(nextStreak("2025-12-30", "2026-01-02")).toBe(1);
  });

  it("strips a JSON markdown fence and validates the review", () => {
    const text = '```json\n{"score":80,"criteria":{"clarity":4,"context":4,"constraints":4,"specificity":4,"output_format":4},"strengths":["Чёткая цель"],"improvements":[{"issue":"Нет деталей","why":"Результат неоднозначен","fix":"Добавь ожидаемое поведение"}],"improved_prompt":"Создай компонент"}\n```';
    expect(parseModelJson(text, reviewSchema).score).toBe(80);
    expect(() => parseModelJson('{"score":101}', reviewSchema)).toThrow();
  });

  it("reports empty model responses without leaking a JSON parser error", () => {
    expect(() => parseModelJson(" \n ", reviewSchema)).toThrow("AI model returned an empty response");
  });
});
