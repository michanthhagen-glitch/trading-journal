import type { Trade } from "./db/database";

function tradeNameTime(trade: Trade) {
  return trade.entry.time ?? trade.exit.time ?? "99:99";
}

function sameTradeNameGroup(left: Trade, right: Trade) {
  return (
    left.date === right.date &&
    (left.accountId ?? null) === (right.accountId ?? null)
  );
}

function compareTradesForName(left: Trade, right: Trade) {
  const timeCompare = tradeNameTime(left).localeCompare(tradeNameTime(right));
  if (timeCompare !== 0) return timeCompare;
  return left.id.localeCompare(right.id);
}

export function tradeDayNumber(trade: Trade, trades: readonly Trade[]) {
  const dayTrades = trades.filter((item) => sameTradeNameGroup(item, trade));
  if (!dayTrades.some((item) => item.id === trade.id)) {
    dayTrades.push(trade);
  }

  const index = dayTrades
    .sort(compareTradesForName)
    .findIndex((item) => item.id === trade.id);
  return index >= 0 ? index + 1 : 1;
}

export function formatTradeName(trade: Trade, trades: readonly Trade[]) {
  return `Trade ${tradeDayNumber(trade, trades)}`;
}

export function formatTradeNameWithPair(
  trade: Trade,
  trades: readonly Trade[],
) {
  const pair = trade.pair.trim();
  const name = formatTradeName(trade, trades);
  return pair ? `${name} - ${pair}` : name;
}
