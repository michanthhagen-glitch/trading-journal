import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { WorkspaceContext } from "../../app/types";
import { listTrades, type Trade } from "../../shared/db/database";

type KpiCardProps = {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: "default" | "positive" | "negative";
};

function KpiCard({
  label,
  value,
  delta,
  icon,
  accent = "default",
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-${accent}`}>
      <div className="kpi-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {delta ? (
          <p
            className={`kpi-delta ${delta.positive ? "positive" : "negative"}`}
          >
            {delta.positive ? (
              <ArrowUpRight size={12} aria-hidden="true" />
            ) : (
              <ArrowDownRight size={12} aria-hidden="true" />
            )}
            <span>{delta.value}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

type ActivityEntry = {
  id: string;
  time: string;
  type: "trade" | "journal" | "recap";
  text: string;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

function fmtMoney(value: number, currency = "USD") {
  const prefix = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `;
  if (value === 0) return `${prefix}0.00`;
  const sign = value > 0 ? "+" : "-";
  return `${sign} ${prefix}${Math.abs(value).toFixed(2)}`;
}

function fmtBalance(value: number, currency = "USD") {
  const prefix = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `;
  return `${prefix}${value.toFixed(2)}`;
}

function fmtPnl(value: number | null) {
  return value == null ? "open" : fmtMoney(value);
}

function actualRiskReward(trade: Trade): number | null {
  const { price, stopLoss } = trade.entry;
  const exitPrice = trade.exit.price;
  if (price === null || stopLoss === null || exitPrice === null) return null;

  const risk = Math.abs(price - stopLoss);
  if (risk <= 0) return null;

  const move =
    trade.direction === "long" ? exitPrice - price : price - exitPrice;
  return move / risk;
}

function fmtR(value: number | null) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : `${value.toFixed(2)}R`;
}

function buildActivity(trades: Trade[]): ActivityEntry[] {
  return trades.slice(0, 5).map((trade) => ({
    id: trade.id,
    time: trade.entry.time ? `${trade.date} ${trade.entry.time}` : trade.date,
    type: "trade",
    text: `${trade.status === "closed" || trade.status === "reviewed" ? "Closed" : "Logged"} ${trade.pair} ${trade.direction} — ${fmtPnl(trade.pnl)}`,
  }));
}

export function DashboardWorkspace({
  selectedAccount,
  selectedAccountId,
}: WorkspaceContext) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTrades(selectedAccountId).then((rows) => {
      if (!cancelled) {
        setTrades(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  const stats = useMemo(() => {
    const closedTrades = trades.filter(
      (trade) => trade.status === "closed" || trade.status === "reviewed",
    );
    const netPnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
    const wins = closedTrades.filter((trade) => trade.exit.result === "win");
    const losses = closedTrades.filter((trade) => trade.exit.result === "loss");
    const breakEvens = closedTrades.filter(
      (trade) => trade.exit.result === "break-even",
    );
    const rrValues = closedTrades
      .map(actualRiskReward)
      .filter((value): value is number => value !== null);
    const avgRr =
      rrValues.length === 0
        ? null
        : rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length;
    const openTrades = trades.filter(
      (trade) => trade.status === "open" || trade.status === "pre-trade",
    );

    return {
      netPnl,
      wins: wins.length,
      losses: losses.length,
      breakEvens: breakEvens.length,
      closedCount: closedTrades.length,
      winRate:
        closedTrades.length === 0
          ? null
          : (wins.length / closedTrades.length) * 100,
      avgRr,
      openCount: openTrades.length,
    };
  }, [trades]);

  const activity = useMemo(() => buildActivity(trades), [trades]);
  const accountCurrency = selectedAccount?.currency ?? "USD";
  const currentBalance = selectedAccount
    ? selectedAccount.startingBalance + stats.netPnl
    : stats.netPnl;
  const accountGrowth =
    selectedAccount && selectedAccount.startingBalance > 0
      ? (stats.netPnl / selectedAccount.startingBalance) * 100
      : null;

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">
            {selectedAccount
              ? `Analytics and activity for ${selectedAccount.name}.`
              : "No account selected. Showing uncategorized data."}
          </p>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Key performance indicators">
        <KpiCard
          label="Balance"
          value={
            loading ? "Loading..." : fmtBalance(currentBalance, accountCurrency)
          }
          delta={{
            value:
              accountGrowth == null
                ? "Growth —"
                : `${accountGrowth >= 0 ? "+" : ""}${accountGrowth.toFixed(2)}% growth`,
            positive: (accountGrowth ?? 0) >= 0,
          }}
          icon={<Wallet size={18} />}
          accent={(accountGrowth ?? 0) >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Net P&L"
          value={
            loading ? "Loading..." : fmtMoney(stats.netPnl, accountCurrency)
          }
          delta={{
            value: `${stats.closedCount} closed`,
            positive: stats.netPnl >= 0,
          }}
          icon={<TrendingUp size={18} />}
          accent={stats.netPnl >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Win / Loss / BE"
          value={`${stats.wins} / ${stats.losses} / ${stats.breakEvens}`}
          delta={{
            value:
              stats.winRate == null
                ? "Win rate —"
                : `Win rate ${stats.winRate.toFixed(1)}%`,
            positive: (stats.winRate ?? 0) >= 50,
          }}
          icon={<BarChart3 size={18} />}
        />
        <KpiCard
          label="Avg R:R"
          value={fmtR(stats.avgRr)}
          delta={{
            value: `${stats.closedCount} closed trades`,
            positive: true,
          }}
          icon={<Activity size={18} />}
        />
      </section>

      <section className="dashboard-row">
        <div className="panel">
          <header className="panel-header">
            <h3>Equity curve</h3>
            <span className="panel-tag">
              {selectedAccount?.name ?? "No account"}
            </span>
          </header>
          <div
            className="panel-body equity-placeholder"
            aria-label="Equity curve placeholder"
          >
            <span>Chart will use the selected account's trade history.</span>
          </div>
        </div>

        <div className="panel">
          <header className="panel-header">
            <h3>Recent activity</h3>
            <span className="panel-tag">{activity.length}</span>
          </header>
          <ul className="activity-list">
            {activity.length === 0 ? (
              <li className="empty-state">No activity for this account yet.</li>
            ) : null}
            {activity.map((entry) => (
              <li
                className={`activity-item activity-${entry.type}`}
                key={entry.id}
              >
                <span className="activity-dot" aria-hidden="true" />
                <div className="activity-content">
                  <p className="activity-text">{entry.text}</p>
                  <p className="activity-time">{entry.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
