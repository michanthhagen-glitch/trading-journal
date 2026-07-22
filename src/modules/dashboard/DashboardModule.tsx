import { BarChart3, ChevronRight, LineChart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ModuleContext } from "../../app/types";
import { ModalShell } from "../../components/ModalShell";
import {
  listAccountSetup,
  listTrades,
  type Educator,
  type RiskManagementPlan,
  type Strategy,
  type Trade,
} from "../../shared/db/database";
import {
  formatDateRangeValue,
  formatDateValue,
  type AppPreferences,
} from "../../shared/appPreferences";
import { BacktestingDashboard } from "./BacktestingDashboard";
import {
  DASHBOARD_TABS,
  DashboardTab,
  DetailState,
  HistoryPoint,
  MonthlyBalanceChart,
  OutcomePoint,
  RING_CIRCUMFERENCE,
  RankingRow,
  RateLeaders,
  RateRow,
  RingSegment,
  SummaryData,
  SummaryScope,
  Tone,
  WeeklyBalanceCard,
  buildDailyBalanceHistory,
  buildDashboardViewModel,
  dateKey,
  detailRateRows,
  endOfWeek,
  fmtAxisCurrency,
  fmtCompactPercent,
  fmtCurrency,
  fmtPercent,
  fmtRangeAmount,
  fmtShortCurrency,
  monthLabel,
  niceChartStep,
  rateRowsWithLabels,
  startOfMonth,
  startOfWeek,
  toneFromNumber,
  weekNumber,
  weekTickLabel,
} from "./dashboardAnalytics";

function LeaderCell({
  mode,
  row,
  tone = mode === "loss" ? "negative" : "positive",
}: {
  mode: "loss" | "win";
  row: RateRow | null;
  tone?: "negative" | "positive";
}) {
  if (!row) {
    return <strong>-</strong>;
  }
  const rate = mode === "win" ? row.winRate : row.lossRate;

  return (
    <strong className={tone === "negative" ? "negative" : ""}>
      <span>{row.label}</span>
      <em>{fmtCompactPercent(rate)}</em>
    </strong>
  );
}

function RiskCell({
  appPreferences,
  currency,
  label,
  summary,
  value,
}: {
  appPreferences: AppPreferences;
  currency: string;
  label: string;
  summary: SummaryData;
  value: number | null;
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <b>
        <small>{label}</small>
        <span>-</span>
      </b>
    );
  }

  return (
    <b>
      <small>{label}</small>
      <span>{fmtCompactPercent(value)}</span>
      <em>
        {fmtRangeAmount(
          value,
          summary.startingBalance,
          currency,
          appPreferences,
        )}
      </em>
    </b>
  );
}

function HoverRing({
  centerLabel,
  centerValue,
  segments,
}: {
  centerLabel: string;
  centerValue: string;
  segments: RingSegment[];
}) {
  const [activeSegment, setActiveSegment] = useState<RingSegment | null>(null);
  const visibleSegments = segments.filter(
    (segment) => Number.isFinite(segment.weight) && segment.weight > 0,
  );
  const totalWeight = visibleSegments.reduce(
    (sum, segment) => sum + segment.weight,
    0,
  );
  let offset = 0;
  const center = activeSegment
    ? { label: activeSegment.label, value: activeSegment.valueText }
    : { label: centerLabel, value: centerValue };

  function updateActiveSegment(
    clientX: number,
    clientY: number,
    target: HTMLElement,
  ) {
    if (visibleSegments.length === 0 || totalWeight === 0) {
      setActiveSegment(null);
      return;
    }

    const box = target.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * 100;
    const y = ((clientY - box.top) / box.height) * 100;
    const dx = x - 50;
    const dy = y - 50;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 28 || distance > 52) {
      setActiveSegment(null);
      return;
    }

    const angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;
    let currentAngle = 0;
    const hoveredSegment =
      visibleSegments.find((segment) => {
        currentAngle += (segment.weight / totalWeight) * 360;
        return angle <= currentAngle;
      }) ?? visibleSegments[visibleSegments.length - 1];

    setActiveSegment(hoveredSegment);
  }

  return (
    <div
      className="dash-hover-ring-wrap"
      onMouseLeave={() => setActiveSegment(null)}
      onMouseMove={(event) =>
        updateActiveSegment(event.clientX, event.clientY, event.currentTarget)
      }
      onMouseOut={() => setActiveSegment(null)}
      onPointerLeave={() => setActiveSegment(null)}
      onPointerMove={(event) =>
        updateActiveSegment(event.clientX, event.clientY, event.currentTarget)
      }
      onPointerOut={() => setActiveSegment(null)}
    >
      <svg
        aria-label={`${centerLabel} ring`}
        className="dash-hover-ring"
        role="img"
        viewBox="0 0 100 100"
      >
        <circle className="dash-ring-track" cx="50" cy="50" r="42" />
        {visibleSegments.length === 0 ? (
          <circle className="dash-ring-empty" cx="50" cy="50" r="42" />
        ) : (
          visibleSegments.map((segment) => {
            const length = (segment.weight / totalWeight) * RING_CIRCUMFERENCE;
            const dashOffset = -offset;
            offset += length;
            return (
              <circle
                className="dash-ring-segment"
                cx="50"
                cy="50"
                key={segment.label}
                onBlur={() => setActiveSegment(null)}
                onFocus={() => setActiveSegment(segment)}
                onMouseEnter={() => setActiveSegment(segment)}
                onMouseLeave={() => setActiveSegment(null)}
                onPointerEnter={() => setActiveSegment(segment)}
                onPointerLeave={() => setActiveSegment(null)}
                r="42"
                stroke={segment.color}
                strokeDasharray={`${Math.max(length - 1.5, 0)} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                tabIndex={0}
              >
                <title>
                  {segment.label}: {segment.valueText}
                </title>
              </circle>
            );
          })
        )}
      </svg>
      <div className="dash-ring-center">
        <strong>{center.value}</strong>
        <span>{center.label}</span>
      </div>
    </div>
  );
}

function TradeRing({ summary }: { summary: SummaryData }) {
  return (
    <HoverRing
      centerLabel="trades"
      centerValue={summary.closed.toString()}
      segments={[
        {
          color: "#6cd49a",
          label: "wins",
          valueText: summary.wins.toString(),
          weight: summary.wins,
        },
        {
          color: "#f08688",
          label: "losses",
          valueText: summary.losses.toString(),
          weight: summary.losses,
        },
        {
          color: "#f5b86c",
          label: "break even",
          valueText: summary.breakEvens.toString(),
          weight: summary.breakEvens,
        },
      ]}
    />
  );
}

function BalanceStack({
  appPreferences,
  currency,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  summary: SummaryData;
}) {
  return (
    <div className="dash-balance-stack">
      <div>
        <span>Starting</span>
        <strong>
          {fmtCurrency(summary.startingBalance, currency, appPreferences)}
        </strong>
      </div>
      <div>
        <span>Current</span>
        <strong className={`primary ${toneFromNumber(summary.netPnl)}`}>
          {fmtCurrency(summary.balance, currency, appPreferences)}
        </strong>
      </div>
      <div>
        <span>Growth</span>
        <strong className={toneFromNumber(summary.growth)}>
          {fmtPercent(summary.growth, appPreferences)}
        </strong>
      </div>
    </div>
  );
}

function PnlRing({
  appPreferences,
  currency,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  summary: SummaryData;
}) {
  return (
    <HoverRing
      centerLabel="net"
      centerValue={fmtShortCurrency(summary.netPnl, currency, appPreferences)}
      segments={[
        {
          color: summary.grossPnl < 0 ? "#f08688" : "#6cd49a",
          label: "gross",
          valueText: fmtShortCurrency(
            summary.grossPnl,
            currency,
            appPreferences,
          ),
          weight: Math.abs(summary.grossPnl),
        },
        {
          color: "#f5b86c",
          label: "commission",
          valueText: fmtShortCurrency(
            summary.commission,
            currency,
            appPreferences,
          ),
          weight: Math.abs(summary.commission),
        },
      ]}
    />
  );
}

function OutcomeBoxes({
  appPreferences,
  currency,
  points,
  title,
}: {
  appPreferences: AppPreferences;
  currency: string;
  points: OutcomePoint[];
  title: string;
}) {
  const visiblePoints = Array.from({ length: 10 }, (_, index) => {
    return (
      points[index] ?? {
        label: "-",
        meta: "No data",
        outcome: "empty" as const,
        value: 0,
      }
    );
  });

  return (
    <div className="dash-outcomes">
      <div className="dash-outcomes-head">
        <span>{title}</span>
      </div>
      <div className="dash-outcome-strip">
        {visiblePoints.map((point, index) => (
          <span
            aria-label={`${point.label} ${point.meta} ${point.outcome}`}
            className={`dash-outcome-box ${point.outcome}`}
            key={`${point.label}-${point.meta}-${index}`}
            title={`${point.label} ${point.meta}: ${fmtCurrency(
              point.value,
              currency,
              appPreferences,
              true,
            )}`}
          />
        ))}
      </div>
    </div>
  );
}

function RateLeadersGrid({ summary }: { summary: SummaryData }) {
  return (
    <div className="dash-rate-grid">
      <section>
        <span>Best win rate</span>
        <div>
          <LeaderCell mode="win" row={summary.rateGroups.day.bestWin} />
          <LeaderCell mode="win" row={summary.rateGroups.session.bestWin} />
          <LeaderCell mode="win" row={summary.rateGroups.time.bestWin} />
        </div>
      </section>
      <section>
        <span>Worst win rate</span>
        <div>
          <LeaderCell
            mode="win"
            row={summary.rateGroups.day.worstWin}
            tone="negative"
          />
          <LeaderCell
            mode="win"
            row={summary.rateGroups.session.worstWin}
            tone="negative"
          />
          <LeaderCell
            mode="win"
            row={summary.rateGroups.time.worstWin}
            tone="negative"
          />
        </div>
      </section>
    </div>
  );
}

function RiskGoalGrid({
  appPreferences,
  currency,
  riskPlan,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  riskPlan: RiskManagementPlan | null;
  summary: SummaryData;
}) {
  const riskMin = riskPlan?.riskPerWeekMinPercent ?? null;
  const riskMax = riskPlan?.riskPerWeekMaxPercent ?? null;
  const riskMid =
    riskMin === null || riskMax === null ? null : (riskMin + riskMax) / 2;

  return (
    <div className="dash-risk-goal-grid">
      <strong>Risk</strong>
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Min"
        summary={summary}
        value={riskMin}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskMid}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Max"
        summary={summary}
        value={riskMax}
      />
      <strong>Goal</strong>
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Min"
        summary={summary}
        value={riskPlan?.weeklyGoalMinPercent ?? null}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Mid"
        summary={summary}
        value={riskPlan?.weeklyGoalMidPercent ?? null}
      />
      <RiskCell
        appPreferences={appPreferences}
        currency={currency}
        label="Max"
        summary={summary}
        value={riskPlan?.weeklyGoalMaxPercent ?? null}
      />
    </div>
  );
}

function SummaryBand({
  appPreferences,
  currency,
  riskPlan,
  summary,
}: {
  appPreferences: AppPreferences;
  currency: string;
  riskPlan: RiskManagementPlan | null;
  summary: SummaryData;
}) {
  return (
    <article className={`dash-summary-band dash-summary-${summary.id}`}>
      <header>
        <div>
          <span>{summary.labels.title}</span>
          <strong>{summary.endLabel}</strong>
        </div>
        <small>{summary.open} open</small>
      </header>
      <div className="dash-summary-core">
        <BalanceStack
          appPreferences={appPreferences}
          currency={currency}
          summary={summary}
        />
        {summary.id === "week" ? (
          <RiskGoalGrid
            appPreferences={appPreferences}
            currency={currency}
            riskPlan={riskPlan}
            summary={summary}
          />
        ) : (
          <RateLeadersGrid summary={summary} />
        )}
      </div>
      <div className="dash-ring-row">
        <div className="dash-ring-tile">
          <PnlRing
            appPreferences={appPreferences}
            currency={currency}
            summary={summary}
          />
        </div>
        <div className="dash-ring-tile">
          <TradeRing summary={summary} />
        </div>
      </div>
      <OutcomeBoxes
        appPreferences={appPreferences}
        currency={currency}
        points={summary.outcomes}
        title={summary.labels.history}
      />
    </article>
  );
}

function ChartPanel({
  currency,
  appPreferences,
  growth,
  icon,
  onOpen,
  points,
  scope,
  title,
}: {
  currency: string;
  appPreferences: AppPreferences;
  growth: number | null;
  icon: React.ReactNode;
  onOpen?: () => void;
  points: HistoryPoint[];
  scope: SummaryScope;
  title: string;
}) {
  const values = points
    .map((point) => point.value)
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
  const rawMin = values.length === 0 ? 0 : Math.min(...values);
  const rawMax = values.length === 0 ? 0 : Math.max(...values);
  const startingBalance =
    points.find(
      (point): point is HistoryPoint & { value: number } =>
        point.value !== null && Number.isFinite(point.value),
    )?.value ?? 0;
  const totalScale =
    scope === "total" && startingBalance > 0
      ? {
          max:
            startingBalance *
            Math.max(
              3,
              Math.ceil(Math.max(rawMax, startingBalance) / startingBalance),
            ),
          min: Math.min(0, rawMin),
        }
      : null;
  const padding = Math.max((rawMax - rawMin) * 0.14, 1);
  const min = totalScale?.min ?? rawMin - padding;
  const max = totalScale?.max ?? rawMax + padding;
  const range = Math.max(max - min, 1);
  const chartWidth = 100;
  const chartHeight = 100;
  const padLeft = 14;
  const padRight = 4;
  const padTop = 4;
  const padBottom = 13;
  const bottomY = chartHeight - padBottom;
  const rightX = chartWidth - padRight;
  const pointRightX = scope === "week" ? rightX - 8 : rightX;
  const plotWidth = pointRightX - padLeft;
  const plotHeight = chartHeight - padTop - padBottom;
  const yForValue = (value: number) =>
    padTop + ((max - value) / range) * plotHeight;
  const coordinates = points.map((point, index) => {
    const x =
      points.length === 1
        ? (padLeft + pointRightX) / 2
        : padLeft + (index / (points.length - 1)) * plotWidth;
    const y = point.value === null ? null : yForValue(point.value);
    return { point, x, y };
  });
  const plottedCoordinates = coordinates.filter(
    (
      item,
    ): item is {
      point: HistoryPoint & { value: number };
      x: number;
      y: number;
    } => item.y !== null && item.point.value !== null,
  );
  const path = plottedCoordinates
    .map((item, index) => `${index === 0 ? "M" : "L"} ${item.x} ${item.y}`)
    .join(" ");
  const areaPath =
    plottedCoordinates.length === 0
      ? ""
      : `${path} L ${
          plottedCoordinates[plottedCoordinates.length - 1].x
        } ${bottomY} L ${plottedCoordinates[0].x} ${bottomY} Z`;
  const currentBalance =
    plottedCoordinates[plottedCoordinates.length - 1]?.point.value ??
    startingBalance;
  const startLineY = yForValue(startingBalance);
  const startTone =
    currentBalance === startingBalance
      ? "flat"
      : currentBalance > startingBalance
        ? "positive"
        : "negative";
  const dayCount = Math.max(
    points.filter(
      (point) => point.meta !== "Starting balance" && point.value !== null,
    ).length,
    0,
  );
  const gridStep =
    totalScale && startingBalance > 0
      ? startingBalance / 2
      : niceChartStep(range / 4);
  const gridStart = Math.ceil(min / gridStep) * gridStep;
  const gridLines =
    gridStep <= 0
      ? []
      : Array.from(
          {
            length: Math.floor((max - gridStart) / gridStep + 0.0001) + 1,
          },
          (_, index) => gridStart + index * gridStep,
        ).filter((value) => value >= min && value <= max);
  const dayTicks = coordinates.filter(
    (item) => item.point.meta !== "Starting balance",
  );
  const pointMetaLabel = (meta: string) =>
    meta === "Starting balance" ? meta : formatDateValue(meta, appPreferences);

  return (
    <section
      aria-label={onOpen ? `Open ${title} detail` : undefined}
      className={`panel dash-graph-panel ${onOpen ? "dash-graph-panel-openable" : ""}`}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === "Enter") onOpen();
      }}
    >
      <header className="panel-header">
        <h3>
          {icon}
          {title}
        </h3>
        <span className="panel-tag">{dayCount} days</span>
      </header>
      <div className="dash-line-chart">
        {points.length === 0 ? (
          <p className="empty-state">No data yet.</p>
        ) : (
          <>
            <svg
              aria-label={`${title} line graph`}
              className="dash-line-svg"
              preserveAspectRatio="none"
              role="img"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              {gridLines.map((value) => {
                const y = yForValue(value);
                return (
                  <g className="dash-grid-line" key={value}>
                    <line x1={padLeft} x2={rightX} y1={y} y2={y} />
                    <text x={padLeft - 2.5} y={y + 1.1}>
                      {fmtAxisCurrency(value, currency, appPreferences)}
                    </text>
                  </g>
                );
              })}
              <line
                className="dash-axis dash-axis-main"
                x1={padLeft}
                x2={padLeft}
                y1={padTop}
                y2={bottomY}
              />
              <line
                className="dash-axis dash-axis-main"
                x1={padLeft}
                x2={rightX}
                y1={bottomY}
                y2={bottomY}
              />
              <path
                className="dash-axis-arrow"
                d={`M ${padLeft - 1.5} ${padTop + 3} L ${padLeft} ${padTop} L ${
                  padLeft + 1.5
                } ${padTop + 3}`}
              />
              <path
                className="dash-axis-arrow"
                d={`M ${rightX - 3} ${bottomY - 1.5} L ${rightX} ${bottomY} L ${
                  rightX - 3
                } ${bottomY + 1.5}`}
              />
              <path className="dash-line-area" d={areaPath} />
              <line
                className={`dash-start-line ${startTone}`}
                x1={padLeft}
                x2={rightX}
                y1={startLineY}
                y2={startLineY}
              >
                <title>
                  Starting balance:{" "}
                  {fmtCurrency(startingBalance, currency, appPreferences)}
                </title>
              </line>
              <path className="dash-line-path" d={path} />
              {plottedCoordinates.map((item) => (
                <circle
                  className="dash-line-dot"
                  cx={item.x}
                  cy={item.y}
                  key={item.point.meta}
                  r="1.35"
                >
                  <title>
                    {pointMetaLabel(item.point.meta)}: P&L{" "}
                    {fmtCurrency(
                      item.point.pnl ?? 0,
                      currency,
                      appPreferences,
                      true,
                    )}
                    . Balance{" "}
                    {fmtCurrency(item.point.value, currency, appPreferences)}.
                  </title>
                </circle>
              ))}
              {dayTicks.map((item) => (
                <g className="dash-x-tick" key={item.point.meta}>
                  <line
                    x1={item.x}
                    x2={item.x}
                    y1={bottomY}
                    y2={bottomY + 1.9}
                  />
                  <text x={item.x} y={bottomY + 5}>
                    {scope === "week"
                      ? weekTickLabel(item.point.meta)
                      : item.point.label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="dash-line-labels">
              <strong>Growth {fmtPercent(growth, appPreferences)}</strong>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function RateStatsCard({
  leaders,
  onOpen,
  title,
  variant = "bestWorst",
}: {
  leaders: RateLeaders;
  onOpen: () => void;
  title: string;
  variant?: "bestWorst" | "buySell" | "simple";
}) {
  const top = leaders.rows[0] ?? null;
  const long = leaders.rows.find((row) => row.label === "Long") ?? null;
  const short = leaders.rows.find((row) => row.label === "Short") ?? null;

  if (variant !== "simple") {
    const left = variant === "buySell" ? long : leaders.bestWin;
    const right = variant === "buySell" ? short : leaders.worstWin;

    return (
      <button
        className="dash-stat-card is-split"
        type="button"
        onClick={onOpen}
      >
        <span>{title}</span>
        <div className="dash-stat-split">
          <RateStatMini
            caption={variant === "buySell" ? "Long" : "Best win rate"}
            row={left}
          />
          <RateStatMini
            caption={variant === "buySell" ? "Short" : "Worst win rate"}
            row={right}
          />
        </div>
      </button>
    );
  }

  return (
    <button className="dash-stat-card" type="button" onClick={onOpen}>
      <span>{title}</span>
      <strong>{top?.label ?? "-"}</strong>
      <small>
        {top
          ? `${fmtCompactPercent(top.winRate)} win / ${fmtCompactPercent(
              top.lossRate,
            )} loss`
          : "No data"}
      </small>
    </button>
  );
}

function RateStatMini({
  caption,
  row,
}: {
  caption: string;
  row: RateRow | null;
}) {
  return (
    <div className="dash-stat-mini">
      <span>{caption}</span>
      <strong>{row?.label ?? "-"}</strong>
      <small>{row ? `${fmtCompactPercent(row.winRate)} win` : "No data"}</small>
    </div>
  );
}

function RankingStatsCard({
  appPreferences,
  currency,
  onOpen,
  rows,
  title,
}: {
  appPreferences: AppPreferences;
  currency: string;
  onOpen: () => void;
  rows: RankingRow[];
  title: string;
}) {
  const top = rows[0] ?? null;
  return (
    <button className="dash-stat-card" type="button" onClick={onOpen}>
      <span>{title}</span>
      <strong>{top?.label ?? "-"}</strong>
      <small>
        {top
          ? `${fmtCurrency(
              top.value,
              currency,
              appPreferences,
              true,
            )} · ${top.meta}`
          : "No data"}
      </small>
    </button>
  );
}

function StatsDetailModal({
  currency,
  appPreferences,
  detail,
  onClose,
}: {
  currency: string;
  appPreferences: AppPreferences;
  detail: DetailState;
  onClose: () => void;
}) {
  const [rateView, setRateView] = useState<"chart" | "table">("table");
  useEffect(() => {
    setRateView("table");
  }, [detail?.title]);

  if (!detail) return null;

  const rateRows =
    detail.type === "rate"
      ? detailRateRows(detail.rows, appPreferences, detail.scope)
      : [];
  const rateNameLabel =
    detail.type === "rate" && detail.scope === "day"
      ? "Day"
      : detail.type === "rate" && detail.scope === "direction"
        ? "Direction"
        : detail.type === "rate" && detail.scope === "session"
          ? "Session"
          : detail.type === "rate" && detail.scope === "time"
            ? "Time"
            : "Name";
  const modalClassName =
    detail.type === "rate"
      ? `dash-detail-modal is-rate-${rateView}`
      : "dash-detail-modal is-ranking";

  return (
    <ModalShell
      ariaLabel={detail.title}
      modalClassName={modalClassName}
      onClose={onClose}
      subtitle={
        detail.type === "rate"
          ? "Detailed win, loss, and P&L view."
          : "Top 10 ranked by net P&L."
      }
      title={detail.title}
    >
      {detail.type === "rate" ? (
        <div className="dash-rate-detail">
          <div
            className="dash-detail-tabs tab-bar"
            role="tablist"
            aria-label={`${detail.title} view`}
          >
            <button
              className={`tab ${rateView === "table" ? "active" : ""}`}
              role="tab"
              aria-selected={rateView === "table"}
              type="button"
              onClick={() => setRateView("table")}
            >
              Table
            </button>
            <button
              className={`tab ${rateView === "chart" ? "active" : ""}`}
              role="tab"
              aria-selected={rateView === "chart"}
              type="button"
              onClick={() => setRateView("chart")}
            >
              Chart
            </button>
          </div>
          {rateView === "table" ? (
            <div
              className={`dash-detail-table dash-rate-detail-table ${
                detail.scope === "day" ? "is-day" : ""
              }`}
            >
              <div>
                <span>{rateNameLabel}</span>
                <span>Trades</span>
                <span>Wins</span>
                <span>Losses</span>
                <span>Breakeven</span>
                <span>Win rate</span>
                <span>Loss rate</span>
                <span>BE rate</span>
                <span>Net P&L</span>
              </div>
              {rateRows.map((row) => (
                <div key={row.label}>
                  <strong>{row.label}</strong>
                  <span>{row.trades}</span>
                  <span className="positive">{row.wins}</span>
                  <span className="negative">{row.losses}</span>
                  <span>{row.breakEvens}</span>
                  <span className="positive">
                    {fmtCompactPercent(row.winRate)}
                  </span>
                  <span className="negative">
                    {fmtCompactPercent(row.lossRate)}
                  </span>
                  <span>{fmtCompactPercent(row.beRate)}</span>
                  <span className={toneFromNumber(row.pnl)}>
                    {fmtCurrency(row.pnl, currency, appPreferences, true)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <RateBarChart rows={rateRows} />
          )}
        </div>
      ) : (
        <div className="dash-detail-table dash-ranking-table">
          <div>
            <span>Name</span>
            <span>Detail</span>
            <span>Trades</span>
            <span>P&L</span>
          </div>
          {detail.rows.map((row) => (
            <div key={row.id}>
              <strong>{row.label}</strong>
              <span>{row.meta}</span>
              <span>{row.trades}</span>
              <span className={toneFromNumber(row.value)}>
                {fmtCurrency(row.value, currency, appPreferences, true)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function RateBarChart({ rows }: { rows: RateRow[] }) {
  const maxCount = Math.max(
    1,
    ...rows.flatMap((row) => [row.wins, row.losses, row.breakEvens]),
  );
  const midCount = Math.ceil(maxCount / 2);
  const scaleTicks = maxCount === 1 ? [0, 1] : [0, midCount, maxCount];

  return (
    <div
      className="dash-rate-bar-chart"
      role="img"
      aria-label="Sideways trade result bar chart"
    >
      <div className="dash-rate-chart-scale" aria-hidden="true">
        <span />
        <div>
          {scaleTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <span>Trades</span>
      </div>
      {rows.map((row) => (
        <div className="dash-rate-bar-row" key={row.label}>
          <strong>{row.label}</strong>
          <div className="dash-rate-bars">
            <RateBar
              label="Win"
              tone="positive"
              value={row.wins}
              max={maxCount}
            />
            <RateBar
              label="Loss"
              tone="negative"
              value={row.losses}
              max={maxCount}
            />
            <RateBar
              label="BE"
              tone="warning"
              value={row.breakEvens}
              max={maxCount}
            />
          </div>
          <span>{row.trades}</span>
        </div>
      ))}
    </div>
  );
}

function RateBar({
  label,
  max,
  tone,
  value,
}: {
  label: string;
  max: number;
  tone: Tone;
  value: number;
}) {
  const width = max <= 0 ? 0 : (value / max) * 100;
  const detail = `${label}: ${value}`;

  return (
    <div className="dash-rate-bar-line" aria-label={detail} title={detail}>
      <div className="dash-rate-bar-track">
        <i className={tone} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ChartHistoryDetailModal({
  charts,
  currency,
  currentYear,
  appPreferences,
  onClose,
}: {
  charts: MonthlyBalanceChart[];
  currency: string;
  currentYear: string;
  appPreferences: AppPreferences;
  onClose: () => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(charts.map((chart) => chart.id.slice(0, 4)))),
    [charts],
  );
  const [activeYear, setActiveYear] = useState(
    years.includes(currentYear)
      ? currentYear
      : (years[years.length - 1] ?? currentYear),
  );
  const visibleCharts = charts.filter((chart) =>
    chart.id.startsWith(activeYear),
  );

  return (
    <ModalShell
      ariaLabel="Monthly balance chart history"
      bodyClassName="dash-chart-detail-body"
      modalClassName="dash-chart-detail-modal"
      onClose={onClose}
      title="Monthly balance charts"
    >
      <div
        className="dash-chart-year-tabs tab-bar"
        role="tablist"
        aria-label="Balance chart year"
      >
        {years.map((year) => (
          <button
            className={`tab ${activeYear === year ? "active" : ""}`}
            key={year}
            role="tab"
            aria-selected={activeYear === year}
            type="button"
            onClick={() => setActiveYear(year)}
          >
            {year}
          </button>
        ))}
      </div>
      {visibleCharts.map((chart) => (
        <ChartPanel
          currency={currency}
          appPreferences={appPreferences}
          growth={chart.growth}
          icon={<LineChart size={14} aria-hidden="true" />}
          key={chart.id}
          points={chart.points}
          scope="month"
          title={chart.label}
        />
      ))}
    </ModalShell>
  );
}

function WeekHistoryDetailModal({
  appPreferences,
  cards,
  currency,
  currentYear,
  onClose,
  onOpenGraph,
}: {
  appPreferences: AppPreferences;
  cards: WeeklyBalanceCard[];
  currency: string;
  currentYear: string;
  onClose: () => void;
  onOpenGraph: (card: WeeklyBalanceCard) => void;
}) {
  const years = useMemo(
    () => Array.from(new Set(cards.map((card) => card.id.slice(0, 4)))),
    [cards],
  );
  const [activeYear, setActiveYear] = useState(
    years.includes(currentYear)
      ? currentYear
      : (years[years.length - 1] ?? currentYear),
  );
  const visibleCards = cards
    .filter((card) => card.id.startsWith(activeYear))
    .sort((a, b) => (a.id < b.id ? 1 : -1));

  return (
    <ModalShell
      ariaLabel="Weekly balance history"
      bodyClassName="dash-week-detail-body"
      modalClassName="dash-chart-detail-modal"
      onClose={onClose}
      title="Weekly balance history"
    >
      <div
        className="dash-chart-year-tabs tab-bar"
        role="tablist"
        aria-label="Weekly balance year"
      >
        {years.map((year) => (
          <button
            className={`tab ${activeYear === year ? "active" : ""}`}
            key={year}
            role="tab"
            aria-selected={activeYear === year}
            type="button"
            onClick={() => setActiveYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      <div className="trade-week-list dash-week-history-list">
        {visibleCards.map((card) => {
          const { summary } = card;
          return (
            <section className="trade-week-group" key={card.id}>
              <button
                className="trade-week-header dash-week-history-row"
                type="button"
                onClick={() => onOpenGraph(card)}
              >
                <span className="trade-week-title">
                  <ChevronRight size={16} aria-hidden="true" />
                  <span>Week {card.weekNumber}</span>
                  <span className="dash-week-range">{card.label}</span>
                </span>
                <span className="trade-week-meta dash-week-history-meta">
                  <span>{summary.closed} closed</span>
                  <span>
                    {summary.wins}W / {summary.losses}L / {summary.breakEvens}BE
                  </span>
                  <span>
                    Growth {fmtPercent(summary.growth, appPreferences)}
                  </span>
                  <strong className={toneFromNumber(summary.netPnl)}>
                    {fmtCurrency(
                      summary.netPnl,
                      currency,
                      appPreferences,
                      true,
                    )}
                  </strong>
                </span>
              </button>
            </section>
          );
        })}
      </div>
    </ModalShell>
  );
}

function WeekChartDetailModal({
  card,
  currency,
  appPreferences,
  onClose,
}: {
  card: WeeklyBalanceCard | null;
  currency: string;
  appPreferences: AppPreferences;
  onClose: () => void;
}) {
  if (!card) return null;

  return (
    <ModalShell
      ariaLabel={`Week ${card.weekNumber} ${card.label} balance graph`}
      bodyClassName="dash-week-chart-body"
      modalClassName="dash-week-chart-modal"
      onClose={onClose}
      title={`Week ${card.weekNumber} · ${card.label}`}
    >
      <ChartPanel
        currency={currency}
        appPreferences={appPreferences}
        growth={card.summary.growth}
        icon={<LineChart size={14} aria-hidden="true" />}
        points={card.points}
        scope="week"
        title="Week balance"
      />
    </ModalShell>
  );
}

export function DashboardModule({
  appPreferences,
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [riskPlan, setRiskPlan] = useState<RiskManagementPlan | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [educators, setEducators] = useState<Educator[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("total");
  const [detail, setDetail] = useState<DetailState>(null);
  const [chartDetailKind, setChartDetailKind] = useState<
    "month" | "week" | null
  >(null);
  const [weekGraphDetail, setWeekGraphDetail] =
    useState<WeeklyBalanceCard | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const [tradeRows, setup] = await Promise.all([
        listTrades(selectedAccountId),
        listAccountSetup(),
      ]);

      if (cancelled) return;

      setTrades(tradeRows);
      setStrategies(setup.strategies);
      setEducators(setup.educators);
      setRiskPlan(
        setup.riskPlans.find(
          (plan) =>
            selectedAccount?.riskPlanId &&
            plan.id === selectedAccount.riskPlanId,
        ) ?? null,
      );
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedAccount, selectedAccountId]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let midnightTimer: number | null = null;

    function refreshNow() {
      setNow(new Date());
    }

    function scheduleMidnightRefresh() {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      midnightTimer = window.setTimeout(
        () => {
          refreshNow();
          scheduleMidnightRefresh();
        },
        Math.max(nextMidnight.getTime() - current.getTime() + 1000, 1000),
      );
    }

    scheduleMidnightRefresh();
    window.addEventListener("focus", refreshNow);
    document.addEventListener("visibilitychange", refreshNow);

    return () => {
      if (midnightTimer) window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshNow);
      document.removeEventListener("visibilitychange", refreshNow);
    };
  }, []);

  const currency = selectedAccount?.currency ?? "USD";
  const commissionPerLot = selectedAccount?.commission ?? 0;
  const accountStart = selectedAccount?.startingBalance ?? 0;

  const dashboard = useMemo(
    () =>
      buildDashboardViewModel({
        accountStart,
        appPreferences,
        commissionPerLot,
        now,
        trades,
      }),
    [accountStart, appPreferences, commissionPerLot, now, trades],
  );

  const tabSummary =
    activeTab === "month"
      ? dashboard.month
      : activeTab === "week"
        ? dashboard.week
        : dashboard.total;
  const tabRankings =
    activeTab === "month"
      ? dashboard.monthRankings
      : activeTab === "week"
        ? dashboard.weekRankings
        : dashboard.totalRankings;
  const sourceDetailRows = useMemo(
    () =>
      rateRowsWithLabels(
        dashboard.total.rateGroups.strategy.rows,
        selectedAccount?.accountType === "system"
          ? educators.map((educator) => educator.name)
          : strategies.map((strategy) => strategy.name),
      ),
    [
      dashboard.total.rateGroups.strategy.rows,
      educators,
      selectedAccount?.accountType,
      strategies,
    ],
  );
  if (selectedAccount?.accountType === "backtesting") {
    return <BacktestingDashboard trades={trades} />;
  }
  const sourceLabel =
    selectedAccount?.accountType === "system" ? "Educator" : "Strategy";
  const currentMonthChart = dashboard.monthlyCharts[
    dashboard.monthlyCharts.length - 1
  ] ?? {
    growth: dashboard.month.growth,
    id: dateKey(startOfMonth(now)),
    label: monthLabel(now),
    points: dashboard.monthDaily,
  };
  const currentWeekCard = dashboard.weeklyCards[
    dashboard.weeklyCards.length - 1
  ] ?? {
    id: dateKey(startOfWeek(now, appPreferences)),
    label: formatDateRangeValue(
      dateKey(startOfWeek(now, appPreferences)),
      dateKey(endOfWeek(now, appPreferences)),
      appPreferences,
    ),
    points: buildDailyBalanceHistory(
      dashboard.week.trades,
      dashboard.week.startingBalance,
      commissionPerLot,
      startOfWeek(now, appPreferences),
      endOfWeek(now, appPreferences),
      now,
      appPreferences,
      true,
    ),
    summary: dashboard.week,
    weekNumber: weekNumber(startOfWeek(now, appPreferences)),
  };
  const activeChart =
    activeTab === "total"
      ? {
          growth: dashboard.total.growth,
          onOpen: undefined,
          points: dashboard.totalDaily,
          scope: "total" as const,
          title: "Total balance",
        }
      : activeTab === "week"
        ? {
            growth: currentWeekCard.summary.growth,
            onOpen: () => setChartDetailKind("week"),
            points: currentWeekCard.points,
            scope: "week" as const,
            title: "Week balance",
          }
        : {
            growth: currentMonthChart.growth,
            onOpen: () => setChartDetailKind("month"),
            points: currentMonthChart.points,
            scope: "month" as const,
            title: "Daily balance",
          };

  return (
    <div className="dashboard dashboard-redesign">
      <section className="dash-summary-stack" aria-label="Dashboard summaries">
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.total}
        />
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.month}
        />
        <SummaryBand
          appPreferences={appPreferences}
          currency={currency}
          riskPlan={riskPlan}
          summary={dashboard.week}
        />
      </section>

      <section className="dash-workspace panel">
        <header className="dash-workspace-header">
          <div className="tab-bar" role="tablist" aria-label="Dashboard detail">
            {DASHBOARD_TABS.map((tab) => (
              <button
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span>
            {activeTab === "statistics"
              ? "Click a card for detail"
              : tabSummary.endLabel}
          </span>
        </header>

        {activeTab === "statistics" ? (
          <div className="dash-stat-grid">
            <RateStatsCard
              title="Days"
              leaders={dashboard.total.rateGroups.day}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.day.rows,
                  scope: "day",
                  title: "Day statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Sessions"
              leaders={dashboard.total.rateGroups.session}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.session.rows,
                  scope: "session",
                  title: "Session statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Time of day"
              leaders={dashboard.total.rateGroups.time}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.time.rows,
                  scope: "time",
                  title: "Time statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Direction"
              leaders={dashboard.total.rateGroups.direction}
              variant="buySell"
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.direction.rows,
                  scope: "direction",
                  title: "Direction statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title="Instrument"
              leaders={dashboard.total.rateGroups.pair}
              onOpen={() =>
                setDetail({
                  rows: dashboard.total.rateGroups.pair.rows,
                  title: "Instrument statistics",
                  type: "rate",
                })
              }
            />
            <RateStatsCard
              title={sourceLabel}
              leaders={dashboard.total.rateGroups.strategy}
              variant="simple"
              onOpen={() =>
                setDetail({
                  rows: sourceDetailRows,
                  title: `${sourceLabel} statistics`,
                  type: "rate",
                })
              }
            />
          </div>
        ) : (
          <div className="dash-workspace-grid">
            <ChartPanel
              currency={currency}
              appPreferences={appPreferences}
              growth={activeChart.growth}
              icon={<LineChart size={14} aria-hidden="true" />}
              onOpen={activeChart.onOpen}
              points={activeChart.points}
              scope={activeChart.scope}
              title={activeChart.title}
            />
            <section className="panel dash-graph-panel">
              <header className="panel-header">
                <h3>
                  <BarChart3 size={14} aria-hidden="true" />
                  Statistics
                </h3>
                <span className="panel-tag">{tabSummary.closed} closed</span>
              </header>
              <div className="dash-stat-strip">
                <div className="dash-stat-column">
                  <h4>Winning</h4>
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning trade"
                    rows={tabRankings.winningTrades}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningTrades,
                        title: `${tabSummary.labels.title} top 10 winning trades`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning day"
                    rows={tabRankings.winningDays}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningDays,
                        title: `${tabSummary.labels.title} top 10 winning days`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning week"
                    rows={tabRankings.winningWeeks}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningWeeks,
                        title: `${tabSummary.labels.title} top 10 winning weeks`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest winning month"
                    rows={tabRankings.winningMonths}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.winningMonths,
                        title: `${tabSummary.labels.title} top 10 winning months`,
                        type: "ranking",
                      })
                    }
                  />
                </div>
                <div className="dash-stat-column">
                  <h4>Losing</h4>
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing trade"
                    rows={tabRankings.losingTrades}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingTrades,
                        title: `${tabSummary.labels.title} top 10 losing trades`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing day"
                    rows={tabRankings.losingDays}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingDays,
                        title: `${tabSummary.labels.title} top 10 losing days`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing week"
                    rows={tabRankings.losingWeeks}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingWeeks,
                        title: `${tabSummary.labels.title} top 10 losing weeks`,
                        type: "ranking",
                      })
                    }
                  />
                  <RankingStatsCard
                    appPreferences={appPreferences}
                    currency={currency}
                    title="Highest losing month"
                    rows={tabRankings.losingMonths}
                    onOpen={() =>
                      setDetail({
                        rows: tabRankings.losingMonths,
                        title: `${tabSummary.labels.title} top 10 losing months`,
                        type: "ranking",
                      })
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      <StatsDetailModal
        currency={currency}
        appPreferences={appPreferences}
        detail={detail}
        onClose={() => setDetail(null)}
      />
      {chartDetailKind === "month" ? (
        <ChartHistoryDetailModal
          charts={dashboard.monthlyCharts}
          currency={currency}
          currentYear={now.getFullYear().toString()}
          appPreferences={appPreferences}
          onClose={() => setChartDetailKind(null)}
        />
      ) : null}
      {chartDetailKind === "week" ? (
        <WeekHistoryDetailModal
          appPreferences={appPreferences}
          cards={dashboard.weeklyCards}
          currency={currency}
          currentYear={now.getFullYear().toString()}
          onClose={() => setChartDetailKind(null)}
          onOpenGraph={(card) => setWeekGraphDetail(card)}
        />
      ) : null}
      <WeekChartDetailModal
        card={weekGraphDetail}
        currency={currency}
        appPreferences={appPreferences}
        onClose={() => setWeekGraphDetail(null)}
      />
    </div>
  );
}
