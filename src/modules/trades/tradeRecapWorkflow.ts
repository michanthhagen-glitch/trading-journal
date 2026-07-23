import type { TradeRecap, TradeRecapInput } from "../../shared/db/database";

export type TradeRecapProfile = "live-demo" | "system";

export const LIVE_RECAP_EMOTIONS = [
  { value: "none", label: "Neutral" },
  { value: "calm", label: "Calm" },
  { value: "focused", label: "Focused" },
  { value: "confident", label: "Confident" },
  { value: "anxious", label: "Anxious" },
  { value: "frustrated", label: "Frustrated" },
  { value: "fomo", label: "FOMO" },
] as const;

export const SYSTEM_EXECUTION_POSITIVES = [
  "Clean execution",
  "Correct entry timing",
  "Correct position size",
  "Followed stop loss",
  "Followed target plan",
  "Followed updates",
];

export const SYSTEM_EXECUTION_MISTAKES = [
  "Entered too early",
  "Entered too late",
  "Wrong position size",
  "Moved stop loss",
  "Exited too early",
  "Missed an update",
];

const EMPTY_RECAP: TradeRecapInput = {
  grade: "",
  followedPlan: "",
  setupQuality: 5,
  entryQuality: 5,
  managementQuality: 5,
  exitQuality: 5,
  mistakeTags: [],
  positiveTags: [],
  emotionTag: "none",
  ruleBroken: false,
  lesson: "",
  nextAction: "",
  body: "",
};

export function createTradeRecapDraft(
  recap: TradeRecap | null,
  profile: TradeRecapProfile,
): TradeRecapInput {
  if (!recap) {
    return profile === "system"
      ? {
          ...EMPTY_RECAP,
          setupQuality: null,
          entryQuality: null,
          managementQuality: null,
          exitQuality: null,
        }
      : { ...EMPTY_RECAP };
  }

  if (profile === "system") {
    return {
      ...recap,
      setupQuality: null,
      entryQuality: null,
      managementQuality: null,
      exitQuality: null,
      emotionTag: "none",
      ruleBroken: false,
      body: recap.body.trim() || recap.lesson.trim() || recap.nextAction.trim(),
      lesson: "",
      nextAction: "",
    };
  }

  return { ...recap };
}

export function prepareTradeRecapForSave(
  input: TradeRecapInput,
  profile: TradeRecapProfile,
): TradeRecapInput {
  if (profile === "live-demo") return input;

  return {
    ...input,
    setupQuality: null,
    entryQuality: null,
    managementQuality: null,
    exitQuality: null,
    emotionTag: "none",
    ruleBroken: false,
    lesson: "",
    nextAction: "",
  };
}

export function tradeRecapValidationError(
  input: TradeRecapInput,
  profile: TradeRecapProfile,
) {
  if (input.grade && input.followedPlan) return null;
  return profile === "system"
    ? "Choose an execution grade and whether you followed the call."
    : "Choose a trade grade and whether you followed your plan.";
}
