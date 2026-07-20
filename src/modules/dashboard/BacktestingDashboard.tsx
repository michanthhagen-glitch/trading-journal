import { BarChart3, FlaskConical, Target } from "lucide-react";
import type { BacktestTarget, Trade } from "../../shared/db/database";

type BacktestOutcome = {
  result: BacktestTarget["result"];
  rr: number | null;
};

type PerformanceRow = {
  label: string;
  trades: number;
  winRate: number | null;
  totalR: number;
};

function targetRr(trade: Trade, target: BacktestTarget) {
  const entry = trade.entry.price;
  const stopLoss = trade.entry.stopLoss;
  const takeProfit = target.takeProfit;
  if (entry === null || stopLoss === null || takeProfit === null) return null;
  const risk = Math.abs(entry - stopLoss);
  if (risk === 0) return null;
  return Math.abs(takeProfit - entry) / risk;
}

function targetsForTrade(trade: Trade): BacktestTarget[] {
  if (trade.backtestTargets.length > 0) return trade.backtestTargets;
  if (trade.entry.takeProfit === null && !trade.exit.result) return [];
  return [
    {
      takeProfit: trade.entry.takeProfit,
      result: trade.exit.result,
    },
  ];
}

function realizedR(outcome: BacktestOutcome) {
  if (outcome.result === "loss") return -1;
  if (outcome.result === "break-even") return 0;
  if (outcome.result === "win") return outcome.rr ?? 0;
  return 0;
}

function formatR(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}R`;
}

function performanceRows(
  trades: Trade[],
  labelFor: (trade: Trade) => string,
): PerformanceRow[] {
  const grouped = new Map<string, BacktestOutcome[]>();
  for (const trade of trades) {
    const label = labelFor(trade) || "Not selected";
    const outcomes = grouped.get(label) ?? [];
    for (const target of targetsForTrade(trade)) {
      if (!target.result) continue;
      outcomes.push({ result: target.result, rr: targetRr(trade, target) });
    }
    grouped.set(label, outcomes);
  }

  return Array.from(grouped.entries())
    .map(([label, outcomes]) => {
      const wins = outcomes.filter(
        (outcome) => outcome.result === "win",
      ).length;
      return {
        label,
        trades: outcomes.length,
        winRate: outcomes.length > 0 ? (wins / outcomes.length) * 100 : null,
        totalR: outcomes.reduce(
          (total, outcome) => total + realizedR(outcome),
          0,
        ),
      };
    })
    .sort((left, right) => right.totalR - left.totalR);
}

function targetPerformanceRows(trades: Trade[]): PerformanceRow[] {
  const maxTargets = trades.reduce(
    (max, trade) => Math.max(max, targetsForTrade(trade).length),
    0,
  );
  return Array.from({ length: maxTargets }, (_, index) => {
    const outcomes = trades.flatMap((trade) => {
      const target = targetsForTrade(trade)[index];
      return target?.result
        ? [{ result: target.result, rr: targetRr(trade, target) }]
        : [];
    });
    const wins = outcomes.filter((outcome) => outcome.result === "win").length;
    return {
      label: `TP ${index + 1}`,
      trades: outcomes.length,
      winRate: outcomes.length > 0 ? (wins / outcomes.length) * 100 : null,
      totalR: outcomes.reduce(
        (total, outcome) => total + realizedR(outcome),
        0,
      ),
    };
  });
}

function maxLossStreak(trades: Trade[]) {
  const results = [...trades]
    .sort((left, right) =>
      `${left.date} ${left.entry.time ?? ""}`.localeCompare(
        `${right.date} ${right.entry.time ?? ""}`,
      ),
    )
    .map((trade) => targetsForTrade(trade)[0]?.result ?? "");
  let current = 0;
  let max = 0;
  for (const result of results) {
    current = result === "loss" ? current + 1 : 0;
    max = Math.max(max, current);
  }
  return max;
}

export function BacktestingDashboard({ trades }: { trades: Trade[] }) {
  const targetOutcomes = trades.flatMap((trade) =>
    targetsForTrade(trade).flatMap((target) =>
      target.result
        ? [{ result: target.result, rr: targetRr(trade, target) }]
        : [],
    ),
  );
  const wins = targetOutcomes.filter(
    (outcome) => outcome.result === "win",
  ).length;
  const plannedRrs = trades.flatMap((trade) =>
    targetsForTrade(trade).flatMap((target) => {
      const rr = targetRr(trade, target);
      return rr === null ? [] : [rr];
    }),
  );
  const totalR = targetOutcomes.reduce(
    (total, outcome) => total + realizedR(outcome),
    0,
  );
  const averageRr =
    plannedRrs.length > 0
      ? plannedRrs.reduce((total, value) => total + value, 0) /
        plannedRrs.length
      : null;
  const sessions = new Set(
    trades.map((trade) => trade.backtestSessionId).filter(Boolean),
  ).size;

  const sections = [
    {
      title: "Strategy performance",
      rows: performanceRows(trades, (trade) => trade.preTrade.strategy),
    },
    { title: "Target comparison", rows: targetPerformanceRows(trades) },
    {
      title: "Key levels",
      rows: performanceRows(trades, (trade) => trade.preTrade.keyLevel),
    },
    {
      title: "Entry conditions",
      rows: performanceRows(trades, (trade) => trade.preTrade.entryCondition),
    },
    {
      title: "Exit conditions",
      rows: performanceRows(trades, (trade) => trade.exit.exitCondition),
    },
  ];

  return (
    <div className="dashboard backtesting-dashboard">
      <section
        className="backtesting-summary-grid"
        aria-label="Backtest summary"
      >
        <BacktestMetric label="Trades" value={trades.length.toString()} />
        <BacktestMetric label="Sessions" value={sessions.toString()} />
        <BacktestMetric
          label="Win rate"
          value={
            targetOutcomes.length > 0
              ? `${((wins / targetOutcomes.length) * 100).toFixed(1)}%`
              : "—"
          }
        />
        <BacktestMetric label="Total R" value={formatR(totalR)} tone={totalR} />
        <BacktestMetric label="Average RR" value={formatR(averageRr)} />
        <BacktestMetric
          label="Max loss streak"
          value={maxLossStreak(trades).toString()}
        />
      </section>

      {trades.length === 0 ? (
        <section className="panel backtesting-empty-state">
          <FlaskConical size={24} aria-hidden="true" />
          <h3>No backtest data yet</h3>
          <p>Start a Backtest Session and save a few trades to see results.</p>
        </section>
      ) : (
        <section className="backtesting-performance-grid">
          {sections.map((section, index) => (
            <PerformanceCard
              key={section.title}
              title={section.title}
              rows={section.rows}
              featured={index < 2}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function BacktestMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: number;
  value: string;
}) {
  return (
    <article className="panel backtesting-metric-card">
      <span>{label}</span>
      <strong
        className={
          tone === undefined
            ? ""
            : tone > 0
              ? "positive"
              : tone < 0
                ? "negative"
                : "flat"
        }
      >
        {value}
      </strong>
    </article>
  );
}

function PerformanceCard({
  featured,
  rows,
  title,
}: {
  featured: boolean;
  rows: PerformanceRow[];
  title: string;
}) {
  return (
    <article
      className={`panel backtesting-performance-card ${featured ? "featured" : ""}`}
    >
      <header className="panel-header">
        <h3>
          {featured ? (
            <BarChart3 size={14} aria-hidden="true" />
          ) : (
            <Target size={14} aria-hidden="true" />
          )}
          {title}
        </h3>
        <span className="panel-tag">{rows.length}</span>
      </header>
      {rows.length === 0 ? (
        <p className="backtesting-card-empty">No completed results yet.</p>
      ) : (
        <div className="backtesting-performance-rows">
          {rows.slice(0, 6).map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <small>
                {row.trades} result{row.trades === 1 ? "" : "s"} ·{" "}
                {row.winRate === null ? "—" : `${row.winRate.toFixed(0)}% win`}
              </small>
              <strong
                className={
                  row.totalR > 0
                    ? "positive"
                    : row.totalR < 0
                      ? "negative"
                      : "flat"
                }
              >
                {formatR(row.totalR)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
