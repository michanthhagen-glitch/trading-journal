import {
  ArchiveRestore,
  BadgeDollarSign,
  CalendarClock,
  DatabaseBackup,
  HardDrive,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import type { ModuleContext } from "../../app/types";
import {
  createJournalBackup,
  isJournalBackupAvailable,
  restoreJournalBackup,
} from "../../shared/db/backup";
import {
  CURRENCY_DISPLAY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
  formatCurrencyValue,
  formatDateTimeValue,
  formatNumberValue,
  type CurrencyDisplayPreference,
  type DateFormatPreference,
  type NumberFormatPreference,
  type TimeFormatPreference,
  type TimezonePreference,
  type WeekStartPreference,
} from "../../shared/appPreferences";

export function SettingsModule({
  appPreferences,
  onAppPreferencesChanged,
}: ModuleContext) {
  const [activeSection, setActiveSection] = useState<"general" | "data">(
    "general",
  );
  const [dataState, setDataState] = useState<{
    busy: boolean;
    message: string;
    tone: "idle" | "success" | "error";
  }>({ busy: false, message: "", tone: "idle" });
  const backupAvailable = isJournalBackupAvailable();

  function updateDateFormat(dateFormat: DateFormatPreference) {
    onAppPreferencesChanged({ ...appPreferences, dateFormat });
  }

  function updateTimeFormat(timeFormat: TimeFormatPreference) {
    onAppPreferencesChanged({ ...appPreferences, timeFormat });
  }

  function updateTimezone(timezone: TimezonePreference) {
    onAppPreferencesChanged({ ...appPreferences, timezone });
  }

  function updateWeekStartDay(weekStartDay: WeekStartPreference) {
    onAppPreferencesChanged({ ...appPreferences, weekStartDay });
  }

  function updateNumberFormat(numberFormat: NumberFormatPreference) {
    onAppPreferencesChanged({ ...appPreferences, numberFormat });
  }

  function updateCurrencyDisplay(currencyDisplay: CurrencyDisplayPreference) {
    onAppPreferencesChanged({ ...appPreferences, currencyDisplay });
  }

  function updateConfirmBeforeDelete(confirmBeforeDelete: boolean) {
    onAppPreferencesChanged({ ...appPreferences, confirmBeforeDelete });
  }

  async function handleCreateBackup() {
    setDataState({ busy: true, message: "Creating backup...", tone: "idle" });
    try {
      const result = await createJournalBackup();
      setDataState(
        result
          ? {
              busy: false,
              message: `Backup saved with ${result.screenshotFiles} screenshot files.`,
              tone: "success",
            }
          : { busy: false, message: "Backup cancelled.", tone: "idle" },
      );
    } catch (error) {
      setDataState({
        busy: false,
        message: error instanceof Error ? error.message : "Backup failed.",
        tone: "error",
      });
    }
  }

  async function handleRestoreBackup() {
    if (
      !window.confirm(
        "Restore a backup? Current journal data will be replaced. Create a fresh backup first if you may need it.",
      )
    ) {
      return;
    }
    setDataState({ busy: true, message: "Restoring backup...", tone: "idle" });
    try {
      const result = await restoreJournalBackup();
      if (!result) {
        setDataState({
          busy: false,
          message: "Restore cancelled.",
          tone: "idle",
        });
        return;
      }
      setDataState({
        busy: true,
        message: "Backup restored. Reloading the journal...",
        tone: "success",
      });
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setDataState({
        busy: false,
        message: error instanceof Error ? error.message : "Restore failed.",
        tone: "error",
      });
    }
  }

  return (
    <div className="settings">
      <div className="settings-workspace">
        <aside className="settings-sidebar" aria-label="Settings sections">
          <button
            className={`settings-nav-item ${activeSection === "general" ? "active" : ""}`}
            type="button"
            aria-current={activeSection === "general" ? "page" : undefined}
            onClick={() => setActiveSection("general")}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>
              <strong>General</strong>
              <small>Date, time, and app defaults</small>
            </span>
          </button>
          <button
            className={`settings-nav-item ${activeSection === "data" ? "active" : ""}`}
            type="button"
            aria-current={activeSection === "data" ? "page" : undefined}
            onClick={() => setActiveSection("data")}
          >
            <HardDrive size={15} aria-hidden="true" />
            <span>
              <strong>Data</strong>
              <small>Backup and restore</small>
            </span>
          </button>
        </aside>

        <div className="settings-content">
          {activeSection === "general" ? (
            <>
              <section className="panel settings-section">
                <header className="settings-section-header">
                  <div>
                    <h4>
                      <CalendarClock size={16} aria-hidden="true" />
                      Date and time
                    </h4>
                    <p>
                      Used across tables, charts, recaps, and trade details.
                    </p>
                  </div>
                  <div className="settings-preview">
                    <span>Preview</span>
                    <strong>
                      {formatDateTimeValue(
                        "2026-07-05",
                        "22:00",
                        appPreferences,
                      )}
                    </strong>
                  </div>
                </header>

                <div className="settings-field-grid">
                  <label className="field">
                    <span>Date format</span>
                    <select
                      value={appPreferences.dateFormat}
                      onChange={(event) =>
                        updateDateFormat(
                          event.target.value as DateFormatPreference,
                        )
                      }
                    >
                      {DATE_FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Time format</span>
                    <select
                      value={appPreferences.timeFormat}
                      onChange={(event) =>
                        updateTimeFormat(
                          event.target.value as TimeFormatPreference,
                        )
                      }
                    >
                      {TIME_FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Time zone</span>
                    <select
                      value={appPreferences.timezone}
                      onChange={(event) =>
                        updateTimezone(event.target.value as TimezonePreference)
                      }
                    >
                      {TIMEZONE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Week starts on</span>
                    <select
                      value={appPreferences.weekStartDay}
                      onChange={(event) =>
                        updateWeekStartDay(
                          event.target.value as WeekStartPreference,
                        )
                      }
                    >
                      {WEEK_START_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="panel settings-section">
                <header className="settings-section-header">
                  <div>
                    <h4>
                      <BadgeDollarSign size={16} aria-hidden="true" />
                      Numbers and safety
                    </h4>
                    <p>Used for money, percentages, and delete actions.</p>
                  </div>
                  <div className="settings-preview">
                    <span>Preview</span>
                    <strong>
                      {formatNumberValue(1000, appPreferences)} ·{" "}
                      {formatCurrencyValue(100, "USD", appPreferences)}
                    </strong>
                  </div>
                </header>

                <div className="settings-field-grid">
                  <label className="field">
                    <span>Number format</span>
                    <select
                      value={appPreferences.numberFormat}
                      onChange={(event) =>
                        updateNumberFormat(
                          event.target.value as NumberFormatPreference,
                        )
                      }
                    >
                      {NUMBER_FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Currency display</span>
                    <select
                      value={appPreferences.currencyDisplay}
                      onChange={(event) =>
                        updateCurrencyDisplay(
                          event.target.value as CurrencyDisplayPreference,
                        )
                      }
                    >
                      {CURRENCY_DISPLAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="settings-check-field">
                    <input
                      type="checkbox"
                      checked={appPreferences.confirmBeforeDelete}
                      onChange={(event) =>
                        updateConfirmBeforeDelete(event.target.checked)
                      }
                    />
                    <span>
                      <strong>Confirm before delete</strong>
                      <small>
                        {appPreferences.confirmBeforeDelete ? "On" : "Off"}
                      </small>
                    </span>
                  </label>
                </div>
              </section>
            </>
          ) : (
            <section className="panel settings-section settings-data-section">
              <header className="settings-section-header">
                <div>
                  <h4>
                    <HardDrive size={16} aria-hidden="true" />
                    Journal data
                  </h4>
                  <p>
                    Backs up the database and every saved chart screenshot
                    together.
                  </p>
                </div>
              </header>

              <div className="settings-data-grid">
                <article className="settings-data-card">
                  <DatabaseBackup size={20} aria-hidden="true" />
                  <div>
                    <h5>Create backup</h5>
                    <p>
                      Choose a folder and save a complete copy of this app's
                      journal.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!backupAvailable || dataState.busy}
                    onClick={handleCreateBackup}
                  >
                    Create backup
                  </button>
                </article>

                <article className="settings-data-card">
                  <ArchiveRestore size={20} aria-hidden="true" />
                  <div>
                    <h5>Restore backup</h5>
                    <p>
                      Replace current data with a complete Trading Journal
                      backup.
                    </p>
                  </div>
                  <button
                    className="ghost-button danger-button"
                    type="button"
                    disabled={!backupAvailable || dataState.busy}
                    onClick={handleRestoreBackup}
                  >
                    Restore backup
                  </button>
                </article>
              </div>

              {!backupAvailable ? (
                <p className="settings-data-note">
                  Backup and restore are available in the installed desktop app.
                </p>
              ) : null}
              {dataState.message ? (
                <p className={`settings-data-status ${dataState.tone}`}>
                  {dataState.message}
                </p>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
