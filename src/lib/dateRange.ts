// Shared date-range helpers for the "Reporting Period" model (Start_Date/End_Date),
// which replaces the old fixed "Reporting_Month" (MM/YYYY) scheme everywhere: report
// creation, viewing, Dashboard filtering, and Word/PDF/Excel export. All dates in this
// module are plain ISO "YYYY-MM-DD" strings — this format sorts/compares correctly as
// plain strings (no Date parsing needed for ordering) and matches the native
// <input type="date"> value format used on the Form and Dashboard pickers.

/** Soft cap on how long a single reporting period may span, configured in one place so
 * it can be adjusted later without hunting through the codebase. Chosen as ~12 months
 * to keep PDF/Word export generation time and payload size safely within Vercel's
 * serverless function limits (large ranges pull many photos into the export). */
export const MAX_RANGE_DAYS = 366;

export function parseISODate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Inclusive day count between two ISO dates (endDate - startDate, in days). */
export function daysBetween(startDate: string, endDate: string): number {
  const s = parseISODate(startDate);
  const e = parseISODate(endDate);
  if (!s || !e) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

export type RangeError = "invalid_date" | "end_before_start" | "range_too_long";

/** Validates a Start/End Date pair. Returns null if valid, otherwise a machine-readable
 * error code the caller maps to a translated message via t(). Used identically on the
 * client (Form, Dashboard) and server (API routes) so validation never drifts between
 * the two — this is the single source of truth for "is this reporting period valid". */
export function validateDateRange(startDate: string, endDate: string): RangeError | null {
  const s = parseISODate(startDate);
  const e = parseISODate(endDate);
  if (!s || !e) return "invalid_date";
  if (e < s) return "end_before_start";
  if (daysBetween(startDate, endDate) > MAX_RANGE_DAYS) return "range_too_long";
  return null;
}

/** True if [aStart, aEnd] and [bStart, bEnd] share at least one day. ISO date strings
 * compare correctly with plain string operators, so no Date parsing is needed here. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Default Start/End Date shown on a fresh Form — the current calendar month, so the
 * everyday "one report per month" workflow needs zero extra clicks compared to before. */
export function currentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

/** Converts a legacy "MM/YYYY" Reporting_Month string into its equivalent Start/End
 * Date pair (1st of month → last day of month). Used only by the one-off Google Sheet
 * migration and as a defensive fallback if any legacy string ever reaches the app. */
export function monthStringToRange(month: string): { startDate: string; endDate: string } | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec((month || "").trim());
  if (!m) return null;
  const mm = Number(m[1]);
  const yyyy = Number(m[2]);
  if (mm < 1 || mm > 12) return null;
  const start = new Date(yyyy, mm - 1, 1);
  const end = new Date(yyyy, mm, 0);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

/** dd/mm/yyyy for human display (VI and EN both use this order in the report header). */
export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Short label for chart axes / list rows, e.g. "01/07 – 31/07/2026" (same year) or
 * "15/12/2025 – 15/01/2026" (spans a year boundary, so both years are shown in full). */
export function formatRangeShort(startDate: string, endDate: string): string {
  const s = parseISODate(startDate);
  const e = parseISODate(endDate);
  if (!s || !e) return `${startDate} – ${endDate}`;
  const sameYear = s.getFullYear() === e.getFullYear();
  const left = sameYear ? `${String(s.getDate()).padStart(2, "0")}/${String(s.getMonth() + 1).padStart(2, "0")}` : formatDisplayDate(startDate);
  return `${left} – ${formatDisplayDate(endDate)}`;
}
