export type DateFormatPreference =
  | "dd-mm-yyyy"
  | "dd-mon-yyyy"
  | "mm-dd-yyyy"
  | "yyyy-mm-dd";

export type TimeFormatPreference = "12h" | "24h";
export type TimezonePreference = "local" | "utc";
export type WeekStartPreference = "monday" | "sunday";
export type NumberFormatPreference = "comma-dot" | "dot-comma";
export type CurrencyDisplayPreference = "symbol" | "code";

export type AppPreferences = {
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  timezone: TimezonePreference;
  weekStartDay: WeekStartPreference;
  numberFormat: NumberFormatPreference;
  currencyDisplay: CurrencyDisplayPreference;
  confirmBeforeDelete: boolean;
};

export const DATE_FORMAT_OPTIONS: {
  label: string;
  value: DateFormatPreference;
}[] = [
  { label: "2026-07-05", value: "yyyy-mm-dd" },
  { label: "05-07-2026", value: "dd-mm-yyyy" },
  { label: "07-05-2026", value: "mm-dd-yyyy" },
  { label: "05 Jul 2026", value: "dd-mon-yyyy" },
];

export const TIME_FORMAT_OPTIONS: {
  label: string;
  value: TimeFormatPreference;
}[] = [
  { label: "22:00", value: "24h" },
  { label: "10:00 PM", value: "12h" },
];

export const TIMEZONE_OPTIONS: {
  label: string;
  value: TimezonePreference;
}[] = [
  { label: "Local time", value: "local" },
  { label: "UTC", value: "utc" },
];

export const WEEK_START_OPTIONS: {
  label: string;
  value: WeekStartPreference;
}[] = [
  { label: "Monday", value: "monday" },
  { label: "Sunday", value: "sunday" },
];

export const NUMBER_FORMAT_OPTIONS: {
  label: string;
  value: NumberFormatPreference;
}[] = [
  { label: "1,000.00", value: "comma-dot" },
  { label: "1.000,00", value: "dot-comma" },
];

export const CURRENCY_DISPLAY_OPTIONS: {
  label: string;
  value: CurrencyDisplayPreference;
}[] = [
  { label: "$100.00", value: "symbol" },
  { label: "100.00 USD", value: "code" },
];

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  dateFormat: "yyyy-mm-dd",
  timeFormat: "24h",
  timezone: "local",
  weekStartDay: "monday",
  numberFormat: "comma-dot",
  currencyDisplay: "symbol",
  confirmBeforeDelete: true,
};

const APP_PREFERENCES_STORAGE_KEY = "trading-journal:date-time-preferences";
const APP_PREFERENCES_CHANGED_EVENT = "trading-journal:app-preferences-changed";
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  USD: "$",
};
const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function isDateFormatPreference(value: unknown): value is DateFormatPreference {
  return DATE_FORMAT_OPTIONS.some((option) => option.value === value);
}

function isTimeFormatPreference(value: unknown): value is TimeFormatPreference {
  return TIME_FORMAT_OPTIONS.some((option) => option.value === value);
}

function isTimezonePreference(value: unknown): value is TimezonePreference {
  return TIMEZONE_OPTIONS.some((option) => option.value === value);
}

function isWeekStartPreference(value: unknown): value is WeekStartPreference {
  return WEEK_START_OPTIONS.some((option) => option.value === value);
}

function isNumberFormatPreference(
  value: unknown,
): value is NumberFormatPreference {
  return NUMBER_FORMAT_OPTIONS.some((option) => option.value === value);
}

function isCurrencyDisplayPreference(
  value: unknown,
): value is CurrencyDisplayPreference {
  return CURRENCY_DISPLAY_OPTIONS.some((option) => option.value === value);
}

function normalizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_APP_PREFERENCES;
  }

  const candidate = value as Partial<AppPreferences>;
  return {
    dateFormat: isDateFormatPreference(candidate.dateFormat)
      ? candidate.dateFormat
      : DEFAULT_APP_PREFERENCES.dateFormat,
    timeFormat: isTimeFormatPreference(candidate.timeFormat)
      ? candidate.timeFormat
      : DEFAULT_APP_PREFERENCES.timeFormat,
    timezone: isTimezonePreference(candidate.timezone)
      ? candidate.timezone
      : DEFAULT_APP_PREFERENCES.timezone,
    weekStartDay: isWeekStartPreference(candidate.weekStartDay)
      ? candidate.weekStartDay
      : DEFAULT_APP_PREFERENCES.weekStartDay,
    numberFormat: isNumberFormatPreference(candidate.numberFormat)
      ? candidate.numberFormat
      : DEFAULT_APP_PREFERENCES.numberFormat,
    currencyDisplay: isCurrencyDisplayPreference(candidate.currencyDisplay)
      ? candidate.currencyDisplay
      : DEFAULT_APP_PREFERENCES.currencyDisplay,
    confirmBeforeDelete:
      typeof candidate.confirmBeforeDelete === "boolean"
        ? candidate.confirmBeforeDelete
        : DEFAULT_APP_PREFERENCES.confirmBeforeDelete,
  };
}

export function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_APP_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    return normalizePreferences(stored ? JSON.parse(stored) : null);
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export function saveAppPreferences(
  preferences: AppPreferences,
): AppPreferences {
  const next = normalizePreferences(preferences);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify(next),
    );
    window.dispatchEvent(new Event(APP_PREFERENCES_CHANGED_EVENT));
  }

  return next;
}

export function subscribeAppPreferences(
  listener: (preferences: AppPreferences) => void,
) {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => listener(loadAppPreferences());
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === APP_PREFERENCES_STORAGE_KEY) handleChange();
  };

  window.addEventListener(APP_PREFERENCES_CHANGED_EVENT, handleChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(APP_PREFERENCES_CHANGED_EVENT, handleChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

type DateParts = {
  day: number;
  month: number;
  weekday: number;
  year: number;
};

type TimeParts = {
  hours: number;
  minutes: number;
};

type DateTimeParts = DateParts & TimeParts;

function dateParts(value: Date | string): DateParts | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      weekday: value.getDay(),
      year: value.getFullYear(),
    };
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return { day, month, weekday: parsed.getDay(), year };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    day: parsed.getDate(),
    month: parsed.getMonth() + 1,
    weekday: parsed.getDay(),
    year: parsed.getFullYear(),
  };
}

function parseTimeParts(value: string | null | undefined): TimeParts | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function dateTimeParts(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  preferences: AppPreferences,
): DateTimeParts | null {
  if (!date) return null;
  const parts = dateParts(date);
  const clock = parseTimeParts(time);
  if (!parts || !clock) return null;

  if (preferences.timezone === "utc") {
    const parsed = new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      clock.hours,
      clock.minutes,
    );
    return {
      day: parsed.getUTCDate(),
      hours: parsed.getUTCHours(),
      minutes: parsed.getUTCMinutes(),
      month: parsed.getUTCMonth() + 1,
      weekday: parsed.getUTCDay(),
      year: parsed.getUTCFullYear(),
    };
  }

  return { ...parts, ...clock };
}

function formatDateParts(
  parts: DateParts,
  preferences: AppPreferences,
  compact = false,
) {
  const day = pad(parts.day);
  const month = pad(parts.month);
  const monthName = MONTH_SHORT_NAMES[parts.month - 1] ?? month;

  if (compact) {
    switch (preferences.dateFormat) {
      case "dd-mm-yyyy":
        return `${day}-${month}`;
      case "dd-mon-yyyy":
        return `${day} ${monthName}`;
      case "mm-dd-yyyy":
      case "yyyy-mm-dd":
        return `${month}-${day}`;
    }
  }

  switch (preferences.dateFormat) {
    case "dd-mm-yyyy":
      return `${day}-${month}-${parts.year}`;
    case "dd-mon-yyyy":
      return `${day} ${monthName} ${parts.year}`;
    case "mm-dd-yyyy":
      return `${month}-${day}-${parts.year}`;
    case "yyyy-mm-dd":
      return `${parts.year}-${month}-${day}`;
  }
}

function formatTimeParts(
  hours: number,
  minutes: number,
  preferences: AppPreferences,
) {
  if (preferences.timeFormat === "24h") {
    return `${pad(hours)}:${pad(minutes)}`;
  }

  const hour12 = hours % 12 || 12;
  return `${hour12}:${pad(minutes)} ${hours >= 12 ? "PM" : "AM"}`;
}

export function formatDateValue(
  value: Date | string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  if (!value) return "-";
  const parts = dateParts(value);
  return parts ? formatDateParts(parts, preferences) : String(value);
}

export function formatCompactDateValue(
  value: Date | string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  if (!value) return "-";
  const parts = dateParts(value);
  return parts ? formatDateParts(parts, preferences, true) : String(value);
}

export function formatWeekdayDateValue(
  value: Date | string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  if (!value) return "-";
  const parts = dateParts(value);
  if (!parts) return String(value);
  return `${WEEKDAY_NAMES[parts.weekday]}, ${formatDateParts(parts, preferences)}`;
}

export function formatTimeValue(
  value: string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  if (!value) return "-";
  const parts = parseTimeParts(value);
  return parts
    ? formatTimeParts(parts.hours, parts.minutes, preferences)
    : value;
}

export function formatTimeForDateValue(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  if (!time) return "-";
  const parts = dateTimeParts(date, time, preferences);
  return parts
    ? formatTimeParts(parts.hours, parts.minutes, preferences)
    : formatTimeValue(time, preferences);
}

export function formatDateTimeValue(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  const parts = dateTimeParts(date, time, preferences);
  if (parts) {
    return `${formatDateParts(parts, preferences)} ${formatTimeParts(
      parts.hours,
      parts.minutes,
      preferences,
    )}`;
  }

  const dateLabel = formatDateValue(date, preferences);
  const timeLabel = formatTimeValue(time, preferences);
  return timeLabel === "-" ? dateLabel : `${dateLabel} ${timeLabel}`;
}

export function formatDateRangeValue(
  start: Date | string,
  end: Date | string,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  return `${formatDateValue(start, preferences)} to ${formatDateValue(
    end,
    preferences,
  )}`;
}

export function startOfWeekByPreference(
  date: Date,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const diff =
    preferences.weekStartDay === "sunday" ? -day : day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function orderedWeekdayLabels(preferences = DEFAULT_APP_PREFERENCES) {
  return preferences.weekStartDay === "sunday"
    ? WEEKDAY_SHORT_NAMES
    : [...WEEKDAY_SHORT_NAMES.slice(1), WEEKDAY_SHORT_NAMES[0]];
}

export function weekdayShortLabel(value: Date | string | null | undefined) {
  if (!value) return "-";
  const parts = dateParts(value);
  return parts ? WEEKDAY_SHORT_NAMES[parts.weekday] : String(value);
}

export function dateTimeWeekdayShortLabel(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  const parts = dateTimeParts(date, time, preferences);
  return parts ? WEEKDAY_SHORT_NAMES[parts.weekday] : null;
}

export function dateTimeMinutesValue(
  date: Date | string | null | undefined,
  time: string | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
) {
  const parts = dateTimeParts(date, time, preferences);
  return parts ? parts.hours * 60 + parts.minutes : null;
}

function separators(preferences: AppPreferences) {
  return preferences.numberFormat === "dot-comma"
    ? { decimal: ",", group: "." }
    : { decimal: ".", group: "," };
}

export function formatNumberValue(
  value: number | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    signed?: boolean;
  } = {},
) {
  if (value == null || !Number.isFinite(value)) return "-";

  const {
    maximumFractionDigits = 2,
    minimumFractionDigits = 2,
    signed = false,
  } = options;
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  const fixed = Math.abs(value).toFixed(maximumFractionDigits);
  const [rawInteger, rawDecimal = ""] = fixed.split(".");
  const { decimal, group } = separators(preferences);
  const integer = rawInteger.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  const trimmedDecimal =
    maximumFractionDigits > minimumFractionDigits
      ? rawDecimal.replace(/0+$/, "").padEnd(minimumFractionDigits, "0")
      : rawDecimal;
  const decimalPart = trimmedDecimal ? `${decimal}${trimmedDecimal}` : "";

  return `${sign}${integer}${decimalPart}`;
}

function currencySymbol(currency: string) {
  const code = currency.toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatCurrencyValue(
  value: number | null | undefined,
  currency = "USD",
  preferences = DEFAULT_APP_PREFERENCES,
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    signed?: boolean;
  } = {},
) {
  if (value == null || !Number.isFinite(value)) return "-";

  const sign = value < 0 ? "-" : options.signed && value > 0 ? "+" : "";
  const amount = formatNumberValue(Math.abs(value), preferences, {
    maximumFractionDigits: options.maximumFractionDigits,
    minimumFractionDigits: options.minimumFractionDigits,
  });
  const code = currency.toUpperCase();

  if (preferences.currencyDisplay === "code") {
    return `${sign}${amount} ${code}`;
  }

  return `${sign}${currencySymbol(code)}${amount}`;
}

export function formatCompactCurrencyValue(
  value: number | null | undefined,
  currency = "USD",
  preferences = DEFAULT_APP_PREFERENCES,
  options: { signed?: boolean } = {},
) {
  if (value == null || !Number.isFinite(value)) return "-";

  const sign = value < 0 ? "-" : options.signed && value > 0 ? "+" : "";
  const amount = Math.abs(value);
  const code = currency.toUpperCase();
  const suffix = amount >= 1_000_000 ? "m" : amount >= 1000 ? "k" : "";
  const compactValue =
    suffix === "m"
      ? amount / 1_000_000
      : suffix === "k"
        ? amount / 1000
        : amount;
  const formatted = formatNumberValue(compactValue, preferences, {
    maximumFractionDigits: Number.isInteger(compactValue) ? 0 : 1,
    minimumFractionDigits: 0,
  });

  if (preferences.currencyDisplay === "code") {
    return `${sign}${formatted}${suffix} ${code}`;
  }

  return `${sign}${currencySymbol(code)}${formatted}${suffix}`;
}

export function formatPercentValue(
  value: number | null | undefined,
  preferences = DEFAULT_APP_PREFERENCES,
  options: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
    signed?: boolean;
  } = {},
) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${formatNumberValue(value, preferences, {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    signed: options.signed ?? true,
  })}%`;
}

export function shouldConfirmDelete(preferences = DEFAULT_APP_PREFERENCES) {
  return preferences.confirmBeforeDelete;
}
