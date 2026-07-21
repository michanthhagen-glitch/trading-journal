export type TradeTargetUnit = "price" | "pips" | "points" | "ticks";
export type TradeDirection = "long" | "short";
export type TradeTargetKind = "stop-loss" | "take-profit";

export type InstrumentGroupId =
  | "forex-major"
  | "forex-minor"
  | "forex-exotic"
  | "metals"
  | "indices"
  | "energy"
  | "crypto";

export type InstrumentDefinition = {
  symbol: string;
  name: string;
  pricePrecision: number;
  pipSize: number;
  pointSize: number;
  tickSize: number;
  aliases?: readonly string[];
};

export type InstrumentGroup = {
  id: InstrumentGroupId;
  label: string;
  instruments: readonly InstrumentDefinition[];
};

type InstrumentProfile = Pick<
  InstrumentDefinition,
  "pricePrecision" | "pipSize" | "pointSize" | "tickSize"
>;

const FOREX_CURRENCIES = new Set([
  "AUD",
  "CAD",
  "CHF",
  "CNH",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "JPY",
  "MXN",
  "NOK",
  "NZD",
  "PLN",
  "SEK",
  "SGD",
  "TRY",
  "USD",
  "ZAR",
]);

function forexInstrument(symbol: string, name: string): InstrumentDefinition {
  const jpyQuote = symbol.endsWith("JPY");
  return {
    symbol,
    name,
    pricePrecision: jpyQuote ? 3 : 5,
    pipSize: jpyQuote ? 0.01 : 0.0001,
    pointSize: jpyQuote ? 0.001 : 0.00001,
    tickSize: jpyQuote ? 0.001 : 0.00001,
  };
}

function marketInstrument(
  symbol: string,
  name: string,
  profile: InstrumentProfile,
  aliases?: readonly string[],
): InstrumentDefinition {
  return { symbol, name, ...profile, aliases };
}

const INDEX_PROFILE: InstrumentProfile = {
  pricePrecision: 1,
  pipSize: 0.1,
  pointSize: 1,
  tickSize: 0.1,
};

const CRYPTO_PROFILE: InstrumentProfile = {
  pricePrecision: 2,
  pipSize: 0.01,
  pointSize: 1,
  tickSize: 0.01,
};

export const INSTRUMENT_GROUPS: readonly InstrumentGroup[] = [
  {
    id: "forex-major",
    label: "Forex · Majors",
    instruments: [
      forexInstrument("EURUSD", "Euro / US Dollar"),
      forexInstrument("GBPUSD", "British Pound / US Dollar"),
      forexInstrument("USDJPY", "US Dollar / Japanese Yen"),
      forexInstrument("USDCHF", "US Dollar / Swiss Franc"),
      forexInstrument("USDCAD", "US Dollar / Canadian Dollar"),
      forexInstrument("AUDUSD", "Australian Dollar / US Dollar"),
      forexInstrument("NZDUSD", "New Zealand Dollar / US Dollar"),
    ],
  },
  {
    id: "forex-minor",
    label: "Forex · Minors",
    instruments: [
      forexInstrument("AUDCAD", "Australian Dollar / Canadian Dollar"),
      forexInstrument("AUDCHF", "Australian Dollar / Swiss Franc"),
      forexInstrument("AUDJPY", "Australian Dollar / Japanese Yen"),
      forexInstrument("AUDNZD", "Australian Dollar / New Zealand Dollar"),
      forexInstrument("CADCHF", "Canadian Dollar / Swiss Franc"),
      forexInstrument("CADJPY", "Canadian Dollar / Japanese Yen"),
      forexInstrument("CHFJPY", "Swiss Franc / Japanese Yen"),
      forexInstrument("EURAUD", "Euro / Australian Dollar"),
      forexInstrument("EURCAD", "Euro / Canadian Dollar"),
      forexInstrument("EURCHF", "Euro / Swiss Franc"),
      forexInstrument("EURGBP", "Euro / British Pound"),
      forexInstrument("EURJPY", "Euro / Japanese Yen"),
      forexInstrument("EURNZD", "Euro / New Zealand Dollar"),
      forexInstrument("GBPAUD", "British Pound / Australian Dollar"),
      forexInstrument("GBPCAD", "British Pound / Canadian Dollar"),
      forexInstrument("GBPCHF", "British Pound / Swiss Franc"),
      forexInstrument("GBPJPY", "British Pound / Japanese Yen"),
      forexInstrument("GBPNZD", "British Pound / New Zealand Dollar"),
      forexInstrument("NZDCAD", "New Zealand Dollar / Canadian Dollar"),
      forexInstrument("NZDCHF", "New Zealand Dollar / Swiss Franc"),
      forexInstrument("NZDJPY", "New Zealand Dollar / Japanese Yen"),
    ],
  },
  {
    id: "forex-exotic",
    label: "Forex · Exotics",
    instruments: [
      forexInstrument("AUDSGD", "Australian Dollar / Singapore Dollar"),
      forexInstrument("EURCZK", "Euro / Czech Koruna"),
      forexInstrument("EURHUF", "Euro / Hungarian Forint"),
      forexInstrument("EURNOK", "Euro / Norwegian Krone"),
      forexInstrument("EURPLN", "Euro / Polish Zloty"),
      forexInstrument("EURSEK", "Euro / Swedish Krona"),
      forexInstrument("EURTRY", "Euro / Turkish Lira"),
      forexInstrument("EURZAR", "Euro / South African Rand"),
      forexInstrument("GBPTRY", "British Pound / Turkish Lira"),
      forexInstrument("GBPZAR", "British Pound / South African Rand"),
      forexInstrument("SGDJPY", "Singapore Dollar / Japanese Yen"),
      forexInstrument("USDCNH", "US Dollar / Chinese Yuan"),
      forexInstrument("USDCZK", "US Dollar / Czech Koruna"),
      forexInstrument("USDHKD", "US Dollar / Hong Kong Dollar"),
      forexInstrument("USDHUF", "US Dollar / Hungarian Forint"),
      forexInstrument("USDMXN", "US Dollar / Mexican Peso"),
      forexInstrument("USDNOK", "US Dollar / Norwegian Krone"),
      forexInstrument("USDPLN", "US Dollar / Polish Zloty"),
      forexInstrument("USDSEK", "US Dollar / Swedish Krona"),
      forexInstrument("USDSGD", "US Dollar / Singapore Dollar"),
      forexInstrument("USDTRY", "US Dollar / Turkish Lira"),
      forexInstrument("USDZAR", "US Dollar / South African Rand"),
    ],
  },
  {
    id: "metals",
    label: "Metals",
    instruments: [
      marketInstrument("XAUUSD", "Gold", {
        pricePrecision: 2,
        pipSize: 0.01,
        pointSize: 1,
        tickSize: 0.01,
      }),
      marketInstrument("XAGUSD", "Silver", {
        pricePrecision: 3,
        pipSize: 0.001,
        pointSize: 1,
        tickSize: 0.001,
      }),
      marketInstrument("XPTUSD", "Platinum", {
        pricePrecision: 2,
        pipSize: 0.01,
        pointSize: 1,
        tickSize: 0.01,
      }),
      marketInstrument("XPDUSD", "Palladium", {
        pricePrecision: 2,
        pipSize: 0.01,
        pointSize: 1,
        tickSize: 0.01,
      }),
    ],
  },
  {
    id: "indices",
    label: "Indices",
    instruments: [
      marketInstrument("NAS100", "Nasdaq 100", INDEX_PROFILE, ["US100"]),
      marketInstrument("SPX500", "S&P 500", INDEX_PROFILE, ["US500"]),
      marketInstrument("US30", "Wall Street 30", INDEX_PROFILE, ["DJ30"]),
      marketInstrument("US2000", "Russell 2000", INDEX_PROFILE),
      marketInstrument("GER40", "Germany 40", INDEX_PROFILE, ["DAX40"]),
      marketInstrument("UK100", "UK 100", INDEX_PROFILE, ["FTSE100"]),
      marketInstrument("FRA40", "France 40", INDEX_PROFILE, ["CAC40"]),
      marketInstrument("EU50", "Euro Stoxx 50", INDEX_PROFILE, ["STOXX50"]),
      marketInstrument("JPN225", "Japan 225", INDEX_PROFILE, ["JP225"]),
      marketInstrument("AUS200", "Australia 200", INDEX_PROFILE),
      marketInstrument("HK50", "Hong Kong 50", INDEX_PROFILE),
      marketInstrument("CHN50", "China A50", INDEX_PROFILE),
    ],
  },
  {
    id: "energy",
    label: "Energy",
    instruments: [
      marketInstrument(
        "UKOIL",
        "Brent Crude Oil",
        {
          pricePrecision: 2,
          pipSize: 0.01,
          pointSize: 1,
          tickSize: 0.01,
        },
        ["BRENT"],
      ),
      marketInstrument(
        "USOIL",
        "WTI Crude Oil",
        {
          pricePrecision: 2,
          pipSize: 0.01,
          pointSize: 1,
          tickSize: 0.01,
        },
        ["WTI"],
      ),
      marketInstrument("NATGAS", "Natural Gas", {
        pricePrecision: 3,
        pipSize: 0.001,
        pointSize: 1,
        tickSize: 0.001,
      }),
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    instruments: [
      marketInstrument("BTCUSD", "Bitcoin / US Dollar", CRYPTO_PROFILE),
      marketInstrument("ETHUSD", "Ethereum / US Dollar", CRYPTO_PROFILE),
      marketInstrument("SOLUSD", "Solana / US Dollar", CRYPTO_PROFILE),
      marketInstrument("XRPUSD", "XRP / US Dollar", CRYPTO_PROFILE),
      marketInstrument("BNBUSD", "BNB / US Dollar", CRYPTO_PROFILE),
      marketInstrument("ADAUSD", "Cardano / US Dollar", CRYPTO_PROFILE),
      marketInstrument("DOGEUSD", "Dogecoin / US Dollar", CRYPTO_PROFILE),
      marketInstrument("LTCUSD", "Litecoin / US Dollar", CRYPTO_PROFILE),
      marketInstrument("AVAXUSD", "Avalanche / US Dollar", CRYPTO_PROFILE),
      marketInstrument("LINKUSD", "Chainlink / US Dollar", CRYPTO_PROFILE),
      marketInstrument("BTCUSDT", "Bitcoin / Tether", CRYPTO_PROFILE),
      marketInstrument("ETHUSDT", "Ethereum / Tether", CRYPTO_PROFILE),
      marketInstrument("SOLUSDT", "Solana / Tether", CRYPTO_PROFILE),
      marketInstrument("XRPUSDT", "XRP / Tether", CRYPTO_PROFILE),
      marketInstrument("BNBUSDT", "BNB / Tether", CRYPTO_PROFILE),
    ],
  },
] as const;

export const COMMON_TRADING_INSTRUMENTS = INSTRUMENT_GROUPS.flatMap(
  (group) => group.instruments,
);

export type InstrumentUnitSizes = {
  pipSize: number;
  pointSize: number;
  tickSize: number;
  pricePrecision: number;
};

export type TradeTargetCalculation = InstrumentUnitSizes & {
  price: number;
  priceDistance: number;
  pips: number;
  points: number;
  ticks: number;
};

export type RiskRewardTarget = {
  ratio: number;
  price: number;
};

export function normalizeInstrumentSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\//g, "")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9._-]/g, "")
    .slice(0, 20);
}

export function isInstrumentSymbol(value: string) {
  return /^[A-Z0-9][A-Z0-9._-]{1,18}[A-Z0-9]$/.test(
    normalizeInstrumentSymbol(value),
  );
}

export function instrumentsWithDraft(values: string[], draft: string) {
  const symbol = normalizeInstrumentSymbol(draft);
  if (!isInstrumentSymbol(symbol)) return values;
  if (values.some((value) => normalizeInstrumentSymbol(value) === symbol)) {
    return values;
  }
  return [...values, symbol];
}

function catalogSymbolCandidate(symbol: string) {
  return symbol.split(/[._-]/)[0] ?? symbol;
}

export function findInstrumentDefinition(symbol: string) {
  const normalized = normalizeInstrumentSymbol(symbol);
  const candidate = catalogSymbolCandidate(normalized);
  return COMMON_TRADING_INSTRUMENTS.find(
    (instrument) =>
      instrument.symbol === candidate ||
      instrument.aliases?.includes(candidate),
  );
}

export function findInstrumentGroup(symbol: string) {
  const definition = findInstrumentDefinition(symbol);
  if (!definition) return undefined;
  return INSTRUMENT_GROUPS.find((group) =>
    group.instruments.some((instrument) => instrument === definition),
  );
}

export function instrumentDisplayName(symbol: string) {
  const normalized = normalizeInstrumentSymbol(symbol);
  const instrument = findInstrumentDefinition(normalized);
  return instrument ? `${normalized} · ${instrument.name}` : normalized;
}

function decimalPlaces(value: string) {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/\.(\d+)$/);
  return match?.[1].length ?? 0;
}

function isForexSymbol(symbol: string) {
  const candidate = catalogSymbolCandidate(symbol);
  if (!/^[A-Z]{6}$/.test(candidate)) return false;
  return (
    FOREX_CURRENCIES.has(candidate.slice(0, 3)) &&
    FOREX_CURRENCIES.has(candidate.slice(3))
  );
}

function inferredProfile(symbol: string): InstrumentProfile {
  if (isForexSymbol(symbol)) {
    const isJpyQuote = catalogSymbolCandidate(symbol).endsWith("JPY");
    return {
      pipSize: isJpyQuote ? 0.01 : 0.0001,
      pointSize: isJpyQuote ? 0.001 : 0.00001,
      tickSize: isJpyQuote ? 0.001 : 0.00001,
      pricePrecision: isJpyQuote ? 3 : 5,
    };
  }

  return {
    pipSize: 0.01,
    pointSize: 1,
    tickSize: 0.01,
    pricePrecision: 2,
  };
}

export function instrumentUnitSizes(
  symbol: string,
  entryPriceInput = "",
): InstrumentUnitSizes {
  const normalized = normalizeInstrumentSymbol(symbol);
  const definition = findInstrumentDefinition(normalized);
  const profile = definition ?? inferredProfile(normalized);
  const enteredPrecision = decimalPlaces(entryPriceInput);
  const isForex = isForexSymbol(normalized);
  const pipPrecision = profile.pipSize >= 1 ? 0 : -Math.log10(profile.pipSize);
  const pricePrecision = isForex
    ? enteredPrecision >= pipPrecision
      ? enteredPrecision
      : profile.pricePrecision
    : Math.max(profile.pricePrecision, enteredPrecision);
  const quotedStep = 10 ** -pricePrecision;

  return {
    pipSize: definition || isForex ? profile.pipSize : quotedStep,
    pointSize: isForex ? quotedStep : profile.pointSize,
    tickSize: Math.min(profile.tickSize, quotedStep),
    pricePrecision,
  };
}

function finiteNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundPrice(value: number, precision: number) {
  return Number(value.toFixed(Math.min(precision, 10)));
}

function targetSign(direction: TradeDirection, kind: TradeTargetKind) {
  const isAboveEntry =
    (direction === "long" && kind === "take-profit") ||
    (direction === "short" && kind === "stop-loss");
  return isAboveEntry ? 1 : -1;
}

function unitSize(unit: TradeTargetUnit, sizes: InstrumentUnitSizes) {
  switch (unit) {
    case "pips":
      return sizes.pipSize;
    case "points":
      return sizes.pointSize;
    case "ticks":
      return sizes.tickSize;
    case "price":
      return 1;
  }
}

export function calculateTradeTarget({
  direction,
  entryPrice,
  entryPriceInput = "",
  input,
  instrument,
  kind,
  unit,
}: {
  direction: TradeDirection;
  entryPrice: string | number | null;
  entryPriceInput?: string;
  input: string | number | null;
  instrument: string;
  kind: TradeTargetKind;
  unit: TradeTargetUnit;
}): TradeTargetCalculation | null {
  const entry = finiteNumber(entryPrice);
  const inputValue = finiteNumber(input);
  if (entry === null || inputValue === null || inputValue < 0) return null;

  const sizes = instrumentUnitSizes(
    instrument,
    entryPriceInput || String(entryPrice ?? ""),
  );
  const price =
    unit === "price"
      ? inputValue
      : roundPrice(
          entry +
            targetSign(direction, kind) * inputValue * unitSize(unit, sizes),
          sizes.pricePrecision,
        );
  const priceDistance = Math.abs(price - entry);

  return {
    ...sizes,
    price,
    priceDistance,
    pips: priceDistance / sizes.pipSize,
    points: priceDistance / sizes.pointSize,
    ticks: priceDistance / sizes.tickSize,
  };
}

export function tradeTargetInputFromPrice({
  entryPrice,
  entryPriceInput = "",
  instrument,
  targetPrice,
  unit,
}: {
  entryPrice: string | number | null;
  entryPriceInput?: string;
  instrument: string;
  targetPrice: string | number | null;
  unit: TradeTargetUnit;
}) {
  const entry = finiteNumber(entryPrice);
  const target = finiteNumber(targetPrice);
  if (target === null) return "";
  if (unit === "price") return String(target);
  if (entry === null) return "";

  const sizes = instrumentUnitSizes(
    instrument,
    entryPriceInput || String(entryPrice ?? ""),
  );
  const distance = Math.abs(target - entry) / unitSize(unit, sizes);
  return Number(distance.toFixed(4)).toString();
}

export function calculateRiskRewardTargets({
  direction,
  entryPrice,
  entryPriceInput = "",
  goal,
  instrument,
  stopLoss,
}: {
  direction: TradeDirection;
  entryPrice: string | number | null;
  entryPriceInput?: string;
  goal: number | null;
  instrument: string;
  stopLoss: string | number | null;
}): RiskRewardTarget[] {
  const entry = finiteNumber(entryPrice);
  const stop = finiteNumber(stopLoss);
  if (
    entry === null ||
    stop === null ||
    goal === null ||
    !Number.isInteger(goal) ||
    goal < 1
  ) {
    return [];
  }
  const risk = Math.abs(entry - stop);
  if (risk === 0) return [];
  const sizes = instrumentUnitSizes(
    instrument,
    entryPriceInput || String(entryPrice ?? ""),
  );
  const sign = direction === "long" ? 1 : -1;
  return Array.from({ length: goal }, (_, index) => {
    const ratio = index + 1;
    return {
      ratio,
      price: roundPrice(entry + sign * risk * ratio, sizes.pricePrecision),
    };
  });
}

export function formatTradeTargetPrice(
  calculation: TradeTargetCalculation | null,
) {
  return calculation
    ? calculation.price.toFixed(calculation.pricePrecision)
    : "";
}

export function formatTradeTargetUnitValue(value: number) {
  return Number(value.toFixed(2)).toString();
}
