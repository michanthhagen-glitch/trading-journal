import { describe, expect, it } from "vitest";
import {
  formatTradeName,
  formatTradeNameWithPair,
} from "../src/shared/tradeNames";
import type { Trade } from "../src/shared/db/database";

function trade(input: {
  accountId?: string | null;
  date: string;
  id: string;
  pair?: string;
  time?: string | null;
}): Trade {
  return {
    id: input.id,
    accountId: input.accountId ?? "ACC-1",
    date: input.date,
    pair: input.pair ?? "EURUSD",
    direction: "long",
    status: "closed",
    preTrade: {
      strategy: "",
      keyLevel: "",
      entryCondition: "",
      riskPercent: null,
      riskAmount: null,
      bias: "",
      notes: "",
      feeling: null,
    },
    entry: {
      time: input.time ?? null,
      price: null,
      lotSize: null,
      stopLoss: null,
      takeProfit: null,
      notes: "",
      confidence: null,
    },
    exit: {
      price: null,
      result: "",
      note: "",
      feeling: null,
      time: null,
      exitCondition: "",
    },
    pnl: null,
    backtestSessionId: null,
    backtestTestedAt: null,
    backtestTargets: [],
    hasRecap: false,
    recap: null,
    screenshots: [],
  };
}

describe("trade names", () => {
  it("numbers trades by time within each day", () => {
    const trades = [
      trade({ id: "late", date: "2026-07-02", time: "14:30" }),
      trade({ id: "early", date: "2026-07-02", time: "10:05" }),
    ];

    expect(formatTradeName(trades[1], trades)).toBe("Trade 1");
    expect(formatTradeName(trades[0], trades)).toBe("Trade 2");
  });

  it("restarts numbering every day", () => {
    const trades = [
      trade({ id: "first-day", date: "2026-07-02", time: "10:05" }),
      trade({ id: "next-day", date: "2026-07-03", time: "09:15" }),
    ];

    expect(formatTradeName(trades[0], trades)).toBe("Trade 1");
    expect(formatTradeName(trades[1], trades)).toBe("Trade 1");
  });

  it("keeps account numbering separate", () => {
    const trades = [
      trade({
        id: "account-a",
        accountId: "ACC-1",
        date: "2026-07-02",
        time: "10:05",
      }),
      trade({
        id: "account-b",
        accountId: "ACC-2",
        date: "2026-07-02",
        time: "10:10",
      }),
    ];

    expect(formatTradeName(trades[0], trades)).toBe("Trade 1");
    expect(formatTradeName(trades[1], trades)).toBe("Trade 1");
  });

  it("can show the instrument without making it the trade name", () => {
    const trades = [
      trade({
        id: "trade-1",
        date: "2026-07-02",
        pair: "NAS100",
        time: "10:05",
      }),
    ];

    expect(formatTradeNameWithPair(trades[0], trades)).toBe("Trade 1 - NAS100");
  });
});
