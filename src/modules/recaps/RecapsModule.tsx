import { CalendarDays, CalendarRange, Edit3, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ModalShell } from "../../components/ModalShell";
import {
  deleteJournalRecap,
  listJournalRecaps,
  listTrades,
  saveJournalRecap,
  type JournalRecapInput,
  type JournalRecapRow,
  type Trade,
  type TradingAccount,
} from "../../shared/db/database";
import type { ModuleContext } from "../../app/types";
import {
  shouldConfirmDelete,
  type AppPreferences,
} from "../../shared/appPreferences";
import { formatTradeName } from "../../shared/tradeNames";

import {
  Cadence,
  ManualRecapField,
  PeriodSourceRow,
  RecapStats,
  TagCount,
  bodyPreview,
  buildBody,
  currentRecapStatus,
  defaultAnchor,
  defaultTitle,
  directionLabel,
  emptyNotes,
  extractRecapNotes,
  fmtPercent,
  fmtPnl,
  fmtR,
  formatRecapPeriod,
  formatTradeTime,
  inferAnchor,
  periodRange,
  periodSourceRows,
  periodTrades,
  planFollowedLabel,
  pnlTone,
  recapFieldsForCadence,
  recapStats,
  recapTitleForPeriod,
  resultClass,
  resultShortLabel,
  reviewFieldsForCadence,
  reviewHeading,
  scoreFieldsForCadence,
  scoreHeading,
  tradeTagCounts,
} from "./recapAnalysis";

const CADENCES: { id: Cadence; label: string; icon: ReactNode }[] = [
  { id: "daily", label: "Daily", icon: <CalendarDays size={16} /> },
  { id: "weekly", label: "Weekly", icon: <CalendarRange size={16} /> },
  { id: "monthly", label: "Monthly", icon: <CalendarRange size={16} /> },
];

export function RecapsModule({
  appPreferences,
  selectedAccount,
  selectedAccountId,
}: ModuleContext) {
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [allRecaps, setAllRecaps] = useState<
    Record<Cadence, JournalRecapRow[]>
  >({
    daily: [],
    monthly: [],
    weekly: [],
  });
  const [recaps, setRecaps] = useState<JournalRecapRow[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorRecap, setEditorRecap] = useState<JournalRecapRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [dailyRecaps, weeklyRecaps, monthlyRecaps, loadedTrades] =
        await Promise.all([
          listJournalRecaps("daily", selectedAccountId),
          listJournalRecaps("weekly", selectedAccountId),
          listJournalRecaps("monthly", selectedAccountId),
          listTrades(selectedAccountId),
        ]);
      const loadedRecaps = {
        daily: dailyRecaps,
        monthly: monthlyRecaps,
        weekly: weeklyRecaps,
      };
      setAllRecaps(loadedRecaps);
      setRecaps(loadedRecaps[cadence]);
      setTrades(loadedTrades);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setEditorOpen(false);
    setEditorRecap(null);
    reload();
  }, [cadence, selectedAccountId]);

  const currentRange = useMemo(
    () => periodRange(cadence, defaultAnchor(cadence), appPreferences),
    [cadence, appPreferences],
  );
  const currentRecap =
    recaps.find((recap) => recap.period === currentRange.period) ?? null;
  const currentStats = useMemo(
    () => recapStats(selectedAccount, trades, currentRange),
    [currentRange, selectedAccount, trades],
  );
  const currency = selectedAccount?.currency ?? "USD";
  const currentStatus = currentRecapStatus(cadence, currentRecap, currentStats);

  function openNewRecap() {
    setEditorRecap(currentRecap);
    setEditorOpen(true);
  }

  function openRecap(recap: JournalRecapRow) {
    setEditorRecap(recap);
    setEditorOpen(true);
  }

  return (
    <div className="recaps">
      <div className="module-toolbar">
        <div className="tab-bar" role="tablist" aria-label="Recap cadence">
          {CADENCES.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={cadence === item.id}
              className={`tab ${cadence === item.id ? "active" : ""}`}
              onClick={() => setCadence(item.id)}
              type="button"
            >
              <span className="tab-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={openNewRecap}
          disabled={loading}
        >
          {currentRecap ? (
            <Edit3 size={16} aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          <span>{currentRecap ? "Edit current" : `New ${cadence} recap`}</span>
        </button>
      </div>

      <section className="recaps-current-list" aria-label="Current recap">
        <div className="list-table-shell">
          <table className="list-table recaps-current-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Trades</th>
                <th>Win / Loss / BE</th>
                <th>Net P&amp;L</th>
                <th>Growth</th>
                <th>Trade recaps</th>
              </tr>
            </thead>
            <tbody>
              <tr className="list-table-row">
                <td>
                  <strong>Current {cadence}</strong>
                  <span>{currentRange.label}</span>
                </td>
                <td>
                  <span className={`recaps-status ${currentStatus.tone}`}>
                    {currentStatus.label}
                  </span>
                </td>
                <td>{currentStats.totalTrades}</td>
                <td>
                  {currentStats.wins} / {currentStats.losses} /{" "}
                  {currentStats.breakEven}
                </td>
                <td className={pnlTone(currentStats.netPnl)}>
                  {fmtPnl(currentStats.netPnl, currency, appPreferences)}
                </td>
                <td className={pnlTone(currentStats.growthPercent)}>
                  {fmtPercent(currentStats.growthPercent, appPreferences)}
                </td>
                <td
                  className={
                    currentStats.missingRecaps > 0 ? "negative" : "positive"
                  }
                >
                  {currentStats.recapped}/{currentStats.totalTrades}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="recap-list" aria-label={`${cadence} recaps`}>
        {loading ? (
          <p className="empty-state">Loading recaps...</p>
        ) : recaps.length === 0 ? (
          <p className="empty-state">
            No {cadence} recaps yet - start with "New {cadence} recap".
          </p>
        ) : (
          <div className="list-table-shell">
            <table className="list-table recaps-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Period</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {recaps.map((recap) => (
                  <tr
                    className="list-table-row list-table-row-clickable"
                    key={recap.id}
                    onDoubleClick={() => openRecap(recap)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openRecap(recap);
                    }}
                    tabIndex={0}
                    title="Double-click to open recap"
                  >
                    <td>
                      <strong>
                        {recapTitleForPeriod(
                          cadence,
                          recap.period,
                          appPreferences,
                        )}
                      </strong>
                    </td>
                    <td>
                      {formatRecapPeriod(cadence, recap.period, appPreferences)}
                    </td>
                    <td>{bodyPreview(recap.body)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen ? (
        <RecapDialog
          account={selectedAccount}
          cadence={cadence}
          appPreferences={appPreferences}
          initialRecap={editorRecap}
          journalRecaps={allRecaps}
          trades={trades}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RecapStatsGrid({
  appPreferences,
  currency,
  stats,
}: {
  appPreferences: AppPreferences;
  currency: string;
  stats: RecapStats;
}) {
  return (
    <div className="recaps-stats-grid">
      <StatTile label="Trades" value={stats.totalTrades} />
      <StatTile
        label="Win / Loss / BE"
        value={`${stats.wins} / ${stats.losses} / ${stats.breakEven}`}
      />
      <StatTile
        label="Win rate"
        value={fmtPercent(stats.winRate, appPreferences)}
      />
      <StatTile
        label="Net P&L"
        value={fmtPnl(stats.netPnl, currency, appPreferences)}
        tone={pnlTone(stats.netPnl)}
      />
      <StatTile
        label="Growth"
        value={fmtPercent(stats.growthPercent, appPreferences)}
        tone={pnlTone(stats.growthPercent)}
      />
      <StatTile label="Avg RR" value={fmtR(stats.averageActualRr)} />
      <StatTile label="Best strategy" value={stats.bestStrategy} />
      <StatTile label="Common mistake" value={stats.commonMistake} />
      <StatTile label="Common emotion" value={stats.commonEmotion} />
      <StatTile
        label="Trade recaps"
        value={`${stats.recapped}/${stats.totalTrades}`}
        tone={stats.missingRecaps > 0 ? "negative" : "positive"}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <div className="recaps-stat-tile">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function RecapPeriodRow({
  anchor,
  cadence,
  onAnchorChange,
  title,
}: {
  anchor: string;
  cadence: Cadence;
  onAnchorChange: (value: string) => void;
  title: string;
}) {
  return (
    <div className="recaps-period-row">
      <label className="field">
        <span>{cadence === "monthly" ? "Month" : "Period date"}</span>
        <input
          type={cadence === "monthly" ? "month" : "date"}
          value={anchor}
          onChange={(event) => onAnchorChange(event.target.value)}
        />
      </label>
      <div className="recaps-auto-title">
        <strong>{title}</strong>
      </div>
    </div>
  );
}

function PeriodRecapWorkspace({
  appPreferences,
  cadence,
  currency,
  mistakeCounts,
  notes,
  onNoteChange,
  positiveCounts,
  sourceRows,
  trades,
}: {
  appPreferences: AppPreferences;
  cadence: Cadence;
  currency: string;
  mistakeCounts: TagCount[];
  notes: Record<string, string>;
  onNoteChange: (key: string, value: string) => void;
  positiveCounts: TagCount[];
  sourceRows: PeriodSourceRow[];
  trades: Trade[];
}) {
  const reviewFields = reviewFieldsForCadence(cadence);
  const scoreFields = scoreFieldsForCadence(cadence);

  return (
    <div className="period-recap-workspace">
      {cadence === "daily" ? (
        <DailyTradeRecapList
          appPreferences={appPreferences}
          currency={currency}
          trades={trades}
        />
      ) : (
        <PeriodSourceList
          appPreferences={appPreferences}
          cadence={cadence}
          currency={currency}
          rows={sourceRows}
        />
      )}

      <div className="period-recap-editor-pane">
        <div className="daily-import-grid">
          <DailyTagCountSection
            counts={mistakeCounts}
            emptyLabel="No mistakes imported yet."
            title="Imported mistakes"
          />
          <DailyTagCountSection
            counts={positiveCounts}
            emptyLabel="Nothing imported yet."
            title="Imported done well"
          />
        </div>

        <section
          className="daily-review-fields"
          aria-label={reviewHeading(cadence)}
        >
          {reviewFields.map((field) => (
            <label className="field daily-review-field" key={field.key}>
              <span>{field.label}</span>
              <textarea
                rows={field.rows ?? 3}
                placeholder={field.placeholder}
                value={notes[field.key] ?? ""}
                onChange={(event) =>
                  onNoteChange(field.key, event.target.value)
                }
              />
            </label>
          ))}
        </section>

        <section
          className="daily-score-fields"
          aria-label={scoreHeading(cadence)}
        >
          {scoreFields.map((field) => (
            <DailyScoreField
              field={field}
              key={field.key}
              value={notes[field.key] ?? field.defaultValue ?? "5"}
              onChange={(value) => onNoteChange(field.key, value)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function PeriodSourceList({
  appPreferences,
  cadence,
  currency,
  rows,
}: {
  appPreferences: AppPreferences;
  cadence: Cadence;
  currency: string;
  rows: PeriodSourceRow[];
}) {
  const done = rows.filter((row) => row.recap).length;
  const title = cadence === "weekly" ? "Daily recaps" : "Weekly recaps";

  return (
    <aside className="period-source-pane" aria-label={title}>
      <header className="daily-pane-header">
        <span>{title}</span>
        <strong>
          {done}/{rows.length}
        </strong>
      </header>

      {rows.length === 0 ? (
        <p className="daily-recap-empty">Nothing to summarize yet.</p>
      ) : (
        <div className="period-source-list">
          {rows.map((row) => (
            <PeriodSourceRowItem
              appPreferences={appPreferences}
              currency={currency}
              key={row.period}
              row={row}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function PeriodSourceRowItem({
  appPreferences,
  currency,
  row,
}: {
  appPreferences: AppPreferences;
  currency: string;
  row: PeriodSourceRow;
}) {
  return (
    <details
      className={`period-source-row${row.recap ? "" : " is-missing"}`}
      aria-label={row.label}
    >
      <summary className="period-source-summary">
        <span className="period-source-identity">
          <span>{row.meta}</span>
          <strong>{row.label}</strong>
        </span>
        <span className={`recaps-status ${row.status.tone}`}>
          {row.status.label}
        </span>
      </summary>

      <div className="period-source-details">
        <div className="daily-trade-detail-grid">
          <span>
            Trades
            <strong>{row.stats.totalTrades}</strong>
          </span>
          <span>
            Win / Loss / BE
            <strong>
              {row.stats.wins} / {row.stats.losses} / {row.stats.breakEven}
            </strong>
          </span>
          <span>
            Net P&L
            <strong className={pnlTone(row.stats.netPnl)}>
              {fmtPnl(row.stats.netPnl, currency, appPreferences)}
            </strong>
          </span>
          <span>
            Growth
            <strong className={pnlTone(row.stats.growthPercent)}>
              {fmtPercent(row.stats.growthPercent, appPreferences)}
            </strong>
          </span>
          <span>
            Trade recaps
            <strong>
              {row.stats.recapped}/{row.stats.totalTrades}
            </strong>
          </span>
          <span>
            Best strategy
            <strong>{row.stats.bestStrategy}</strong>
          </span>
        </div>

        {row.recap ? (
          <div className="daily-trade-note">
            <span>Summary</span>
            <p>{bodyPreview(row.recap.body) || "No summary written."}</p>
          </div>
        ) : (
          <p>
            {row.stats.totalTrades === 0
              ? "No trades in this period."
              : "No recap saved yet."}
          </p>
        )}
      </div>
    </details>
  );
}

function DailyTradeRecapList({
  appPreferences,
  currency,
  trades,
}: {
  appPreferences: AppPreferences;
  currency: string;
  trades: Trade[];
}) {
  const recapped = trades.filter((trade) => trade.hasRecap).length;

  return (
    <aside className="daily-trade-recap-pane" aria-label="Trade recaps">
      <header className="daily-pane-header">
        <span>Trade recaps</span>
        <strong>
          {recapped}/{trades.length}
        </strong>
      </header>

      {trades.length === 0 ? (
        <p className="daily-recap-empty">No trades for this day.</p>
      ) : (
        <div className="daily-trade-recap-list">
          {trades.map((trade) => (
            <DailyTradeRecapRow
              appPreferences={appPreferences}
              currency={currency}
              key={trade.id}
              trade={trade}
              tradeName={formatTradeName(trade, trades)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function DailyTradeRecapRow({
  appPreferences,
  currency,
  trade,
  tradeName,
}: {
  appPreferences: AppPreferences;
  currency: string;
  trade: Trade;
  tradeName: string;
}) {
  const recap = trade.recap;

  return (
    <details
      className={`daily-trade-recap-row${recap ? "" : " is-missing"}`}
      aria-label={`${tradeName} trade recap`}
    >
      <summary className="daily-trade-recap-summary">
        <span className="daily-trade-recap-identity">
          <span>{formatTradeTime(trade, appPreferences)}</span>
          <strong>{tradeName}</strong>
        </span>
        <span className={`result-pill ${resultClass(trade.exit.result)}`}>
          {resultShortLabel(trade.exit.result)}
        </span>
      </summary>

      <div className="daily-trade-recap-details">
        <div className="daily-trade-detail-grid">
          <span>
            Instrument
            <strong>{trade.pair || "-"}</strong>
          </span>
          <span>
            Direction
            <strong>{directionLabel(trade.direction)}</strong>
          </span>
          <span>
            Result
            <strong>{resultShortLabel(trade.exit.result)}</strong>
          </span>
          <span>
            P&L
            <strong className={pnlTone(trade.pnl)}>
              {fmtPnl(trade.pnl, currency, appPreferences)}
            </strong>
          </span>
          <span>
            Recap
            <strong>{recap ? recap.grade || "Done" : "Missing"}</strong>
          </span>
          <span>
            Plan
            <strong>
              {recap ? planFollowedLabel(recap.followedPlan) : "-"}
            </strong>
          </span>
        </div>

        {recap ? (
          <>
            <DailyTradeTags
              emptyLabel="No mistakes"
              label="Mistakes"
              tags={recap.mistakeTags}
            />
            <DailyTradeTags
              emptyLabel="Nothing marked"
              label="Done well"
              tags={recap.positiveTags}
            />
            <div className="daily-trade-note">
              <span>Lesson</span>
              <p>{recap.lesson || "No lesson written."}</p>
            </div>
            <div className="daily-trade-note">
              <span>Next time</span>
              <p>{recap.nextAction || "No next action written."}</p>
            </div>
          </>
        ) : (
          <p>Create the trade recap first to import its notes here.</p>
        )}
      </div>
    </details>
  );
}

function DailyTradeTags({
  emptyLabel,
  label,
  tags,
}: {
  emptyLabel: string;
  label: string;
  tags: string[];
}) {
  return (
    <div className="daily-trade-tags">
      <span>{label}</span>
      <div>
        {tags.length > 0 ? (
          tags.map((tag) => <b key={tag}>{tag}</b>)
        ) : (
          <em>{emptyLabel}</em>
        )}
      </div>
    </div>
  );
}

function DailyTagCountSection({
  counts,
  emptyLabel,
  title,
}: {
  counts: TagCount[];
  emptyLabel: string;
  title: string;
}) {
  return (
    <section className="daily-import-section">
      <header>
        <span>{title}</span>
        <strong>{counts.reduce((sum, item) => sum + item.count, 0)}</strong>
      </header>
      {counts.length > 0 ? (
        <div className="daily-import-tags">
          {counts.map((item) => (
            <span key={item.label}>
              {item.label}
              {item.count > 1 ? <b>x{item.count}</b> : null}
            </span>
          ))}
        </div>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </section>
  );
}

function DailyScoreField({
  field,
  onChange,
  value,
}: {
  field: ManualRecapField;
  onChange: (value: string) => void;
  value: string;
}) {
  const parsed = Number(value);
  const score = Number.isFinite(parsed) ? parsed : 5;

  return (
    <label className="daily-score-field">
      <span>
        {field.label}
        <strong>{score}/10</strong>
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={score}
        onChange={(event) => onChange(event.target.value)}
        className="feeling-slider"
      />
      <div className="feeling-bar feeling-bar-large" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={`feeling-cell ${index < score ? "filled" : ""}`}
          />
        ))}
      </div>
    </label>
  );
}

function RecapDialog({
  account,
  cadence,
  appPreferences,
  initialRecap,
  journalRecaps,
  trades,
  onClose,
  onSaved,
}: {
  account: TradingAccount | null;
  cadence: Cadence;
  appPreferences: AppPreferences;
  initialRecap: JournalRecapRow | null;
  journalRecaps: Record<Cadence, JournalRecapRow[]>;
  trades: Trade[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [anchor, setAnchor] = useState(() =>
    initialRecap
      ? inferAnchor(cadence, initialRecap.period)
      : defaultAnchor(cadence),
  );
  const range = periodRange(cadence, anchor, appPreferences);
  const stats = useMemo(
    () => recapStats(account, trades, range),
    [account, range, trades],
  );
  const tradesInPeriod = useMemo(
    () => periodTrades(trades, range),
    [range, trades],
  );
  const mistakeCounts = useMemo(
    () => tradeTagCounts(tradesInPeriod, "mistakeTags"),
    [tradesInPeriod],
  );
  const positiveCounts = useMemo(
    () => tradeTagCounts(tradesInPeriod, "positiveTags"),
    [tradesInPeriod],
  );
  const recapFields = recapFieldsForCadence(cadence);
  const sourceRows = useMemo(
    () =>
      periodSourceRows({
        account,
        appPreferences,
        cadence,
        journalRecaps,
        range,
        trades,
      }),
    [account, appPreferences, cadence, journalRecaps, range, trades],
  );
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    return initialRecap
      ? extractRecapNotes(initialRecap.body, cadence)
      : emptyNotes(recapFields);
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = account?.currency ?? "USD";
  const title = defaultTitle(cadence, range);

  function updateNote(key: string, value: string) {
    setNotes((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = buildBody(
        cadence,
        range,
        stats,
        notes,
        currency,
        appPreferences,
        tradesInPeriod,
      );
      const input: JournalRecapInput = {
        id: initialRecap?.id,
        accountId: account?.id ?? null,
        cadence,
        title,
        period: range.period,
        body,
      };
      await saveJournalRecap(input);
      await onSaved();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save recap. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialRecap) return;

    if (
      shouldConfirmDelete(appPreferences) &&
      !window.confirm(
        `Delete this ${cadence} recap? This only removes the saved recap.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteJournalRecap(initialRecap.id);
      await onSaved();
    } catch (deleteError) {
      console.error(deleteError);
      setError("Delete failed. Restart the app and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ModalShell
      ariaLabel={`${cadence} recap`}
      bodyClassName="recaps-modal-body recaps-split-modal-body"
      modalClassName="recaps-modal recaps-split-modal"
      onClose={onClose}
      onSubmit={handleSubmit}
      subtitle={range.label}
      title={`${initialRecap ? "Edit" : "Create"} ${cadence} recap`}
      headerActions={
        initialRecap ? (
          <button
            className="ghost-button danger-button recap-delete-button"
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </button>
        ) : null
      }
      headerContent={
        <div className="period-recap-header-summary">
          <RecapPeriodRow
            anchor={anchor}
            cadence={cadence}
            onAnchorChange={setAnchor}
            title={title}
          />
          <RecapStatsGrid
            appPreferences={appPreferences}
            currency={currency}
            stats={stats}
          />
        </div>
      }
      footer={
        <>
          {error ? (
            <p className="modal-save-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={saving || deleting}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={saving || deleting}
          >
            {saving ? "Saving..." : "Save recap"}
          </button>
        </>
      }
    >
      <PeriodRecapWorkspace
        appPreferences={appPreferences}
        cadence={cadence}
        currency={currency}
        mistakeCounts={mistakeCounts}
        notes={notes}
        onNoteChange={updateNote}
        positiveCounts={positiveCounts}
        sourceRows={sourceRows}
        trades={tradesInPeriod}
      />
    </ModalShell>
  );
}
