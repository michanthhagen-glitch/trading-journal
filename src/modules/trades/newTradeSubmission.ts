import type {
  NewTrade,
  RiskManagementPlan,
  TradeResult,
  TradingAccount,
} from "../../shared/db/database";
import type { ResolvedTargetPlan } from "./strategyWorkflow";
import { parseTradeNumber } from "./strategyWorkflow";
import { riskPlanMax, riskPlanMin } from "./tradePresentation";

export type NewTradeFormState = {
  date: string;
  pair: string;
  direction: "long" | "short";
  strategy: string;
  keyLevel: string;
  entryCondition: string;
  exitCondition: string;
  riskPercent: string;
  riskAmount: string;
  bias: string;
  setupNotes: string;
  feelingBefore: number;
  entryTime: string;
  entryPrice: string;
  lotSize: string;
  stopLoss: string;
  takeProfits: string[];
  entryNotes: string;
  confidence: number;
  exitPrice: string;
  exitTime: string;
  result: TradeResult;
  pnl: string;
  exitNote: string;
  feelingAfter: number;
};

type SubmissionInput = {
  account: TradingAccount;
  form: NewTradeFormState;
  isSystemAccount: boolean;
  riskPlan: RiskManagementPlan | null;
  sourceLabel: string;
  targetPlan: ResolvedTargetPlan;
  tradeSourceCount: number;
};

export type NewTradeSubmission =
  | { error: string; trade: null }
  | { error: null; trade: NewTrade };

export function buildNewTradeSubmission({
  account,
  form,
  isSystemAccount,
  riskPlan,
  sourceLabel,
  targetPlan,
  tradeSourceCount,
}: SubmissionInput): NewTradeSubmission {
  if (tradeSourceCount === 0) {
    return {
      error: `Selected account needs at least one linked ${sourceLabel.toLowerCase()}.`,
      trade: null,
    };
  }
  if (!form.pair.trim()) {
    return { error: "Instrument is required.", trade: null };
  }
  if (!form.strategy.trim()) {
    return { error: `${sourceLabel} is required.`, trade: null };
  }

  const enteredTakeProfits = targetPlan.takeProfits.filter(
    (target) => targetPlan.mode === "risk-reward" || target.input.trim(),
  );
  if (
    (form.stopLoss.trim() && !targetPlan.stopLoss) ||
    (targetPlan.mode !== "risk-reward" &&
      enteredTakeProfits.some((target) => target.price === null))
  ) {
    return {
      error: "Enter a valid entry price to calculate SL and TP.",
      trade: null,
    };
  }
  if (
    targetPlan.mode === "risk-reward" &&
    (!targetPlan.stopLoss ||
      enteredTakeProfits.some((target) => target.price === null))
  ) {
    return {
      error: "Enter the entry price and stop loss to calculate RR targets.",
      trade: null,
    };
  }

  const riskPercentValue = parseTradeNumber(form.riskPercent);
  if (!isSystemAccount && riskPlan) {
    if (riskPercentValue === null) {
      return { error: "Risk % is required for this risk plan.", trade: null };
    }
    const minRisk = riskPlanMin(riskPlan);
    const maxRisk = riskPlanMax(riskPlan);
    if (minRisk !== null && riskPercentValue < minRisk) {
      return {
        error: `Risk % must be at least ${minRisk}%.`,
        trade: null,
      };
    }
    if (maxRisk !== null && riskPercentValue > maxRisk) {
      return { error: `Risk % must be ${maxRisk}% or lower.`, trade: null };
    }
  }

  const takeProfitPrices = enteredTakeProfits.flatMap((target) =>
    target.price === null ? [] : [target.price],
  );
  const hasEntryInput = Boolean(
    form.entryTime ||
    form.entryPrice ||
    form.lotSize ||
    form.stopLoss ||
    targetPlan.takeProfits.some((target) => target.input.trim()) ||
    form.entryNotes.trim(),
  );
  const hasExitInput = Boolean(
    form.exitTime ||
    form.exitPrice ||
    form.result ||
    form.pnl ||
    form.exitNote.trim(),
  );

  return {
    error: null,
    trade: {
      accountId: account.id,
      date: form.date,
      pair: form.pair.toUpperCase().trim(),
      direction: form.direction,
      preTrade: {
        strategy: form.strategy.trim(),
        keyLevel: form.keyLevel,
        entryCondition: form.entryCondition,
        riskPercent: isSystemAccount ? null : riskPercentValue,
        riskAmount: isSystemAccount ? null : parseTradeNumber(form.riskAmount),
        bias: isSystemAccount ? "" : form.bias.trim(),
        notes: isSystemAccount ? "" : form.setupNotes.trim(),
        feeling: isSystemAccount ? null : form.feelingBefore,
      },
      entry: {
        time: form.entryTime || null,
        price: parseTradeNumber(form.entryPrice),
        lotSize: parseTradeNumber(form.lotSize),
        stopLoss: targetPlan.stopLoss?.price ?? null,
        takeProfit:
          takeProfitPrices.length > 0
            ? takeProfitPrices[takeProfitPrices.length - 1]
            : null,
        takeProfits: takeProfitPrices,
        notes: form.entryNotes.trim(),
        confidence: isSystemAccount || !hasEntryInput ? null : form.confidence,
      },
      exit: {
        price: parseTradeNumber(form.exitPrice),
        result: form.result,
        note: form.exitNote.trim(),
        feeling: isSystemAccount || !hasExitInput ? null : form.feelingAfter,
        time: form.exitTime || null,
        exitCondition: form.exitCondition,
      },
      pnl: parseTradeNumber(form.pnl),
      backtestSessionId: null,
      backtestTestedAt: null,
      backtestTargets: [],
    },
  };
}
