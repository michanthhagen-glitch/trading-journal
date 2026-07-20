import { describe, expect, it } from "vitest";
import { strategyOptionsWithDraft } from "../src/modules/account/strategyOptions";

describe("strategy journal options", () => {
  it("includes typed text when the strategy form is saved without Add", () => {
    expect(strategyOptionsWithDraft(["Previous day high"], "  VWAP  ")).toEqual(
      ["Previous day high", "VWAP"],
    );
  });

  it("ignores blank or duplicate draft values", () => {
    const values = ["Previous day high"];

    expect(strategyOptionsWithDraft(values, "   ")).toBe(values);
    expect(strategyOptionsWithDraft(values, "previous DAY high")).toBe(values);
  });
});
