import { describe, expect, it } from "vitest";
import {
  createTradeRecapDraft,
  prepareTradeRecapForSave,
  tradeRecapValidationError,
} from "../src/modules/trades/tradeRecapWorkflow";

describe("trade recap workflows", () => {
  it("starts System recaps without normal trade quality scores", () => {
    const draft = createTradeRecapDraft(null, "system");

    expect(draft.setupQuality).toBeNull();
    expect(draft.entryQuality).toBeNull();
    expect(draft.managementQuality).toBeNull();
    expect(draft.exitQuality).toBeNull();
  });

  it("keeps System recap saves focused on execution and one note", () => {
    const draft = createTradeRecapDraft(null, "system");
    const saved = prepareTradeRecapForSave(
      {
        ...draft,
        grade: "A",
        followedPlan: "yes",
        emotionTag: "anxious",
        ruleBroken: true,
        lesson: "Old lesson",
        nextAction: "Old next action",
        body: "Execution note",
      },
      "system",
    );

    expect(saved.body).toBe("Execution note");
    expect(saved.emotionTag).toBe("none");
    expect(saved.ruleBroken).toBe(false);
    expect(saved.lesson).toBe("");
    expect(saved.nextAction).toBe("");
  });

  it("requires only the two quick scoring choices", () => {
    const draft = createTradeRecapDraft(null, "live-demo");

    expect(tradeRecapValidationError(draft, "live-demo")).toBeTruthy();
    expect(
      tradeRecapValidationError(
        { ...draft, grade: "B", followedPlan: "partial" },
        "live-demo",
      ),
    ).toBeNull();
  });
});
