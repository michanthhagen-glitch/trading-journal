import { describe, expect, it } from "vitest";
import {
  calculateTradeTarget,
  findInstrumentGroup,
  INSTRUMENT_GROUPS,
  instrumentsWithDraft,
  instrumentUnitSizes,
  normalizeInstrumentSymbol,
  tradeTargetInputFromPrice,
} from "../src/shared/tradeInstruments";

describe("trade instruments", () => {
  it("organizes the common library by market", () => {
    expect(INSTRUMENT_GROUPS.map((group) => group.id)).toEqual([
      "forex-major",
      "forex-minor",
      "forex-exotic",
      "metals",
      "indices",
      "energy",
      "crypto",
    ]);
    expect(findInstrumentGroup("EURUSD")?.id).toBe("forex-major");
    expect(findInstrumentGroup("GBPJPY")?.id).toBe("forex-minor");
    expect(findInstrumentGroup("XAUUSD")?.id).toBe("metals");
    expect(findInstrumentGroup("NAS100")?.id).toBe("indices");
    expect(findInstrumentGroup("UKOIL")?.id).toBe("energy");
    expect(findInstrumentGroup("BTCUSD")?.id).toBe("crypto");
  });

  it("normalizes catalog and custom broker symbols", () => {
    expect(normalizeInstrumentSymbol(" eur/usd ")).toBe("EURUSD");
    expect(normalizeInstrumentSymbol("nas100.cash")).toBe("NAS100.CASH");
    expect(findInstrumentGroup("NAS100.cash")?.id).toBe("indices");
  });

  it("adds a typed instrument once and ignores incomplete symbols", () => {
    const instruments = ["EURUSD"];
    expect(instrumentsWithDraft(instruments, " nas100 ")).toEqual([
      "EURUSD",
      "NAS100",
    ]);
    expect(instrumentsWithDraft(instruments, "eur/usd")).toBe(instruments);
    expect(instrumentsWithDraft(instruments, "EU")).toBe(instruments);
  });

  it("uses standard Forex pip and fractional-point sizes", () => {
    expect(instrumentUnitSizes("EURUSD", "1.08543")).toEqual({
      pipSize: 0.0001,
      pointSize: 0.00001,
      tickSize: 0.00001,
      pricePrecision: 5,
    });
    expect(instrumentUnitSizes("USDJPY", "150.123")).toEqual({
      pipSize: 0.01,
      pointSize: 0.001,
      tickSize: 0.001,
      pricePrecision: 3,
    });
  });

  it("calculates long Forex SL and TP prices from pips", () => {
    const stop = calculateTradeTarget({
      instrument: "EURUSD",
      entryPrice: 1.08543,
      entryPriceInput: "1.08543",
      direction: "long",
      kind: "stop-loss",
      unit: "pips",
      input: 20,
    });
    const target = calculateTradeTarget({
      instrument: "EURUSD",
      entryPrice: 1.08543,
      entryPriceInput: "1.08543",
      direction: "long",
      kind: "take-profit",
      unit: "pips",
      input: 35,
    });

    expect(stop?.price).toBe(1.08343);
    expect(stop?.points).toBeCloseTo(200);
    expect(target?.price).toBe(1.08893);
    expect(target?.ticks).toBeCloseTo(350);
  });

  it("calculates index prices from points, ticks, and pips", () => {
    expect(
      calculateTradeTarget({
        instrument: "NAS100",
        entryPrice: 21000.5,
        entryPriceInput: "21000.5",
        direction: "long",
        kind: "take-profit",
        unit: "points",
        input: 25,
      })?.price,
    ).toBe(21025.5);
    expect(
      calculateTradeTarget({
        instrument: "NAS100",
        entryPrice: 21000.5,
        entryPriceInput: "21000.5",
        direction: "short",
        kind: "take-profit",
        unit: "ticks",
        input: 25,
      })?.price,
    ).toBe(20998);
  });

  it("uses useful profiles for metals, energy, and crypto", () => {
    expect(instrumentUnitSizes("XAUUSD", "2420.35")).toMatchObject({
      pipSize: 0.01,
      pointSize: 1,
      tickSize: 0.01,
    });
    expect(instrumentUnitSizes("UKOIL", "82.45")).toMatchObject({
      pipSize: 0.01,
      pointSize: 1,
      tickSize: 0.01,
    });
    expect(instrumentUnitSizes("BTCUSD", "67250.25")).toMatchObject({
      pipSize: 0.01,
      pointSize: 1,
      tickSize: 0.01,
    });
  });

  it("uses entered quote precision for an unknown broker symbol", () => {
    expect(instrumentUnitSizes("CUSTOM.CFD", "123.4567")).toEqual({
      pipSize: 0.0001,
      pointSize: 1,
      tickSize: 0.0001,
      pricePrecision: 4,
    });
  });

  it("turns a saved price back into the preferred input unit", () => {
    expect(
      tradeTargetInputFromPrice({
        instrument: "EURUSD",
        entryPrice: 1.08543,
        entryPriceInput: "1.08543",
        targetPrice: 1.08343,
        unit: "pips",
      }),
    ).toBe("20");
  });
});
