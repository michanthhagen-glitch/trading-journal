import {
  BadgeDollarSign,
  CalendarClock,
  SlidersHorizontal,
} from "lucide-react";
import type { ModuleContext } from "../../app/types";
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

  return (
    <div className="settings">
      <div className="settings-workspace">
        <aside className="settings-sidebar" aria-label="Settings sections">
          <button
            className="settings-nav-item active"
            type="button"
            aria-current="page"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>
              <strong>General</strong>
              <small>Date, time, and app defaults</small>
            </span>
          </button>
        </aside>

        <div className="settings-content">
          <section className="panel settings-section">
            <header className="settings-section-header">
              <div>
                <h4>
                  <CalendarClock size={16} aria-hidden="true" />
                  Date and time
                </h4>
                <p>Used across tables, charts, recaps, and trade details.</p>
              </div>
              <div className="settings-preview">
                <span>Preview</span>
                <strong>
                  {formatDateTimeValue("2026-07-05", "22:00", appPreferences)}
                </strong>
              </div>
            </header>

            <div className="settings-field-grid">
              <label className="field">
                <span>Date format</span>
                <select
                  value={appPreferences.dateFormat}
                  onChange={(event) =>
                    updateDateFormat(event.target.value as DateFormatPreference)
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
                    updateTimeFormat(event.target.value as TimeFormatPreference)
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
        </div>
      </div>
    </div>
  );
}
