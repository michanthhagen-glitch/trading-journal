import { CalendarDays, CalendarRange, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listJournalRecaps,
  type JournalRecapRow,
} from "../../shared/db/database";
import type { WorkspaceContext } from "../../app/types";

type Cadence = "daily" | "weekly" | "monthly";

const CADENCES: { id: Cadence; label: string; icon: React.ReactNode }[] = [
  { id: "daily", label: "Daily", icon: <CalendarDays size={16} /> },
  { id: "weekly", label: "Weekly", icon: <CalendarRange size={16} /> },
  { id: "monthly", label: "Monthly", icon: <CalendarRange size={16} /> },
];

export function JournalWorkspace({
  selectedAccount,
  selectedAccountId,
}: WorkspaceContext) {
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [recaps, setRecaps] = useState<JournalRecapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listJournalRecaps(cadence, selectedAccountId).then((rows) => {
      if (!cancelled) {
        setRecaps(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cadence, selectedAccountId]);

  return (
    <div className="journal">
      <header className="page-header">
        <div>
          <h2>Journal</h2>
          <p className="page-subtitle">
            {selectedAccount
              ? `Daily, weekly, and monthly recaps for ${selectedAccount.name}.`
              : "No account selected. Recaps are not filtered."}
          </p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={16} aria-hidden="true" />
          <span>New {cadence} recap</span>
        </button>
      </header>

      <div className="tab-bar" role="tablist" aria-label="Recap cadence">
        {CADENCES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cadence === c.id}
            className={`tab ${cadence === c.id ? "active" : ""}`}
            onClick={() => setCadence(c.id)}
            type="button"
          >
            <span className="tab-icon" aria-hidden="true">
              {c.icon}
            </span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="recap-list">
        {loading ? (
          <p className="empty-state">Loading recaps…</p>
        ) : recaps.length === 0 ? (
          <p className="empty-state">
            No {cadence} recaps yet — start with "New {cadence} recap".
          </p>
        ) : (
          recaps.map((r) => (
            <article className="recap-card" key={r.id}>
              <header className="recap-card-header">
                <h3>{r.title}</h3>
                <span className="recap-date">{r.period}</span>
              </header>
              <p>{r.body}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
