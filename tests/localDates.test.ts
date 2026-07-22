import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dateKey,
  endOfMonth,
  firstOfMonth,
  parseDate,
  sameMonth,
} from "../src/shared/localDates";

describe("local date helpers", () => {
  it("round-trips calendar dates without UTC shifts", () => {
    const date = parseDate("2026-07-05");

    expect(dateKey(date)).toBe("2026-07-05");
    expect(date.getHours()).toBe(0);
  });

  it("moves across day and month boundaries", () => {
    const date = parseDate("2026-01-31");

    expect(dateKey(addDays(date, 1))).toBe("2026-02-01");
    expect(dateKey(addMonths(date, 1))).toBe("2026-02-01");
  });

  it("provides consistent month boundaries", () => {
    const date = parseDate("2024-02-15");

    expect(dateKey(firstOfMonth(date))).toBe("2024-02-01");
    expect(dateKey(endOfMonth(date))).toBe("2024-02-29");
    expect(sameMonth(date, endOfMonth(date))).toBe(true);
  });
});
