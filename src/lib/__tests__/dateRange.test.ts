import { describe, it, expect } from "vitest";
import {
  parseISODate,
  toISODate,
  daysBetween,
  validateDateRange,
  rangesOverlap,
  currentMonthRange,
  monthStringToRange,
  formatDisplayDate,
  formatRangeShort,
  MAX_RANGE_DAYS,
} from "@/lib/dateRange";

describe("parseISODate / toISODate", () => {
  it("parses a valid ISO date", () => {
    const d = parseISODate("2026-07-15");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6); // 0-indexed
    expect(d?.getDate()).toBe(15);
  });

  it("returns null for empty/invalid input", () => {
    expect(parseISODate("")).toBeNull();
    expect(parseISODate(undefined)).toBeNull();
    expect(parseISODate("not-a-date")).toBeNull();
  });

  it("round-trips through toISODate", () => {
    const iso = "2026-01-05";
    const d = parseISODate(iso);
    expect(toISODate(d as Date)).toBe(iso);
  });
});

describe("daysBetween", () => {
  it("computes inclusive day span correctly", () => {
    expect(daysBetween("2026-07-01", "2026-07-31")).toBe(30);
    expect(daysBetween("2026-07-01", "2026-07-01")).toBe(0);
  });

  it("returns 0 for invalid dates instead of throwing", () => {
    expect(daysBetween("", "2026-07-01")).toBe(0);
  });
});

describe("validateDateRange — the gate every report creation/API call goes through", () => {
  it("accepts a normal same-month range", () => {
    expect(validateDateRange("2026-07-01", "2026-07-31")).toBeNull();
  });

  it("accepts a single-day range (Start === End)", () => {
    expect(validateDateRange("2026-07-15", "2026-07-15")).toBeNull();
  });

  it("rejects End before Start", () => {
    expect(validateDateRange("2026-07-31", "2026-07-01")).toBe("end_before_start");
  });

  it("rejects invalid date strings", () => {
    expect(validateDateRange("not-a-date", "2026-07-01")).toBe("invalid_date");
    expect(validateDateRange("2026-07-01", "")).toBe("invalid_date");
  });

  it("rejects a range longer than the configured MAX_RANGE_DAYS (soft 12-month cap)", () => {
    // Exactly at the boundary should still pass.
    expect(validateDateRange("2026-01-01", "2026-12-31")).toBeNull(); // 364 days, within cap
    // Comfortably over 12 months should fail.
    expect(validateDateRange("2024-01-01", "2026-12-31")).toBe("range_too_long");
  });

  it("MAX_RANGE_DAYS is configured as documented (~12 months)", () => {
    expect(MAX_RANGE_DAYS).toBe(366);
  });
});

describe("rangesOverlap — drives every Dashboard/export 'is this report in the viewed period' check", () => {
  it("detects a fully-contained range as overlapping", () => {
    expect(rangesOverlap("2026-07-01", "2026-07-31", "2026-01-01", "2026-12-31")).toBe(true);
  });

  it("detects identical ranges as overlapping", () => {
    expect(rangesOverlap("2026-07-01", "2026-07-31", "2026-07-01", "2026-07-31")).toBe(true);
  });

  it("detects partial overlap at a boundary", () => {
    expect(rangesOverlap("2026-06-15", "2026-07-15", "2026-07-01", "2026-07-31")).toBe(true);
  });

  it("detects touching-at-a-single-day ranges as overlapping (inclusive)", () => {
    expect(rangesOverlap("2026-06-01", "2026-07-01", "2026-07-01", "2026-07-31")).toBe(true);
  });

  it("returns false for genuinely disjoint ranges", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-31", "2026-07-01", "2026-07-31")).toBe(false);
  });
});

describe("currentMonthRange", () => {
  it("returns the first and last day of the current calendar month", () => {
    const { startDate, endDate } = currentMonthRange();
    const s = parseISODate(startDate) as Date;
    const e = parseISODate(endDate) as Date;
    expect(s.getDate()).toBe(1);
    // e should be the last day of the same month as s
    const nextDay = new Date(e);
    nextDay.setDate(e.getDate() + 1);
    expect(nextDay.getMonth()).not.toBe(e.getMonth());
    expect(s.getMonth()).toBe(e.getMonth());
  });
});

describe("monthStringToRange — the exact formula used to migrate legacy Reporting_Month rows", () => {
  it("converts a 31-day month correctly", () => {
    expect(monthStringToRange("07/2026")).toEqual({ startDate: "2026-07-01", endDate: "2026-07-31" });
  });

  it("converts a 30-day month correctly", () => {
    expect(monthStringToRange("04/2026")).toEqual({ startDate: "2026-04-01", endDate: "2026-04-30" });
  });

  it("converts February in a non-leap year correctly", () => {
    expect(monthStringToRange("02/2026")).toEqual({ startDate: "2026-02-01", endDate: "2026-02-28" });
  });

  it("converts February in a leap year correctly", () => {
    expect(monthStringToRange("02/2024")).toEqual({ startDate: "2024-02-01", endDate: "2024-02-29" });
  });

  it("returns null for a malformed month string", () => {
    expect(monthStringToRange("13/2026")).toBeNull();
    expect(monthStringToRange("2026-07")).toBeNull();
    expect(monthStringToRange("")).toBeNull();
  });
});

describe("formatDisplayDate / formatRangeShort", () => {
  it("formats an ISO date as dd/mm/yyyy", () => {
    expect(formatDisplayDate("2026-07-05")).toBe("05/07/2026");
  });

  it("shortens same-year ranges on the left side", () => {
    expect(formatRangeShort("2026-07-01", "2026-07-31")).toBe("01/07 – 31/07/2026");
  });

  it("shows full dates on both sides when the range spans a year boundary", () => {
    expect(formatRangeShort("2025-12-15", "2026-01-15")).toBe("15/12/2025 – 15/01/2026");
  });
});
