import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "../src/shared/appPreferences";
import { periodRange } from "../src/modules/recaps/recapAnalysis";

describe("recap period ranges", () => {
  it("keeps daily recaps on the selected local date", () => {
    expect(
      periodRange("daily", "2026-07-22", DEFAULT_APP_PREFERENCES),
    ).toMatchObject({
      start: "2026-07-22",
      end: "2026-07-22",
      period: "2026-07-22",
    });
  });

  it("uses the configured week boundary", () => {
    expect(
      periodRange("weekly", "2026-07-22", DEFAULT_APP_PREFERENCES),
    ).toMatchObject({
      start: "2026-07-20",
      end: "2026-07-26",
      period: "2026-07-20 -> 2026-07-26",
    });
  });

  it("covers the full selected month", () => {
    expect(
      periodRange("monthly", "2024-02", DEFAULT_APP_PREFERENCES),
    ).toMatchObject({
      start: "2024-02-01",
      end: "2024-02-29",
      period: "2024-02",
    });
  });
});
