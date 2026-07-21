import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_PREFERENCES,
  formatCompactDateValue,
  formatCurrencyValue,
  formatDateTimeValue,
  formatDateValue,
  formatNumberValue,
  formatPercentValue,
  formatTimeValue,
  orderedWeekdayLabels,
  startOfWeekByPreference,
  type AppPreferences,
} from "../src/shared/appPreferences";

const preferences: AppPreferences = {
  ...DEFAULT_APP_PREFERENCES,
  dateFormat: "dd-mm-yyyy",
  timeFormat: "12h",
};

describe("app preferences", () => {
  it("defaults protective targets to price input", () => {
    expect(DEFAULT_APP_PREFERENCES.tradeTargetUnit).toBe("price");
  });

  it("formats dates with the selected date format", () => {
    expect(formatDateValue("2026-07-05", preferences)).toBe("05-07-2026");
  });

  it("formats times with the selected time format", () => {
    expect(formatTimeValue("22:15", preferences)).toBe("10:15 PM");
  });

  it("formats date and time together from one preference object", () => {
    expect(formatDateTimeValue("2026-07-05", "00:05", preferences)).toBe(
      "05-07-2026 12:05 AM",
    );
  });

  it("keeps compact date labels short for charts", () => {
    expect(
      formatCompactDateValue("2026-07-05", {
        ...DEFAULT_APP_PREFERENCES,
        dateFormat: "dd-mon-yyyy",
        timeFormat: "24h",
      }),
    ).toBe("05 Jul");
  });

  it("starts weeks from the selected day", () => {
    const date = new Date(2026, 6, 8);

    expect(
      formatDateValue(
        startOfWeekByPreference(date, {
          ...DEFAULT_APP_PREFERENCES,
          weekStartDay: "monday",
        }),
      ),
    ).toBe("2026-07-06");
    expect(
      formatDateValue(
        startOfWeekByPreference(date, {
          ...DEFAULT_APP_PREFERENCES,
          weekStartDay: "sunday",
        }),
      ),
    ).toBe("2026-07-05");
  });

  it("orders weekday labels from the selected week start", () => {
    expect(
      orderedWeekdayLabels({
        ...DEFAULT_APP_PREFERENCES,
        weekStartDay: "sunday",
      })[0],
    ).toBe("Sun");
    expect(
      orderedWeekdayLabels({
        ...DEFAULT_APP_PREFERENCES,
        weekStartDay: "monday",
      })[0],
    ).toBe("Mon");
  });

  it("formats numbers with the selected separators", () => {
    expect(
      formatNumberValue(1000, {
        ...DEFAULT_APP_PREFERENCES,
        numberFormat: "comma-dot",
      }),
    ).toBe("1,000.00");
    expect(
      formatNumberValue(1000, {
        ...DEFAULT_APP_PREFERENCES,
        numberFormat: "dot-comma",
      }),
    ).toBe("1.000,00");
  });

  it("formats currency with the selected display style", () => {
    expect(
      formatCurrencyValue(100, "USD", {
        ...DEFAULT_APP_PREFERENCES,
        currencyDisplay: "symbol",
      }),
    ).toBe("$100.00");
    expect(
      formatCurrencyValue(100, "USD", {
        ...DEFAULT_APP_PREFERENCES,
        currencyDisplay: "code",
      }),
    ).toBe("100.00 USD");
  });

  it("formats percentages through number preferences", () => {
    expect(
      formatPercentValue(12.5, {
        ...DEFAULT_APP_PREFERENCES,
        numberFormat: "dot-comma",
      }),
    ).toBe("+12,50%");
  });
});
