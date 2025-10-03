// web/src/lib/time.ts
import { addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const APP_TZ =
  process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

/**
 * Convert a JS Date or ISO string (UTC instant) to a Date that
 * represents the same instant, but convenient for formatting
 * in the app timezone.
 */
export function asDate(input: Date | string): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/**
 * Convert a wall-clock time in APP_TZ to the corresponding UTC instant.
 * Example: "2025-10-03T00:00:00" interpreted in Asia/Tokyo -> UTC Date.
 */
export function localWallclockToUtc(input: Date | string): Date {
  // fromZonedTime treats the given date as local wall-clock in the TZ,
  // returning the corresponding UTC instant.
  return fromZonedTime(asDate(input), APP_TZ);
}

/**
 * Convert a UTC instant to a zoned Date (for formatting/display).
 */
export function utcToZoned(input: Date | string): Date {
  return toZonedTime(asDate(input), APP_TZ);
}

/**
 * Given "YYYY-MM-DD" (calendar day in APP_TZ), return the UTC window
 * [dayStartUtc, dayEndUtc) that covers that local day.
 */
export function dayRangeInUtc(dateStr: string): {
  dayStartUtc: Date;
  dayEndUtc: Date;
} {
  const startLocal = new Date(`${dateStr}T00:00:00`);
  const endLocal = addDays(startLocal, 1);
  const dayStartUtc = localWallclockToUtc(startLocal);
  const dayEndUtc = localWallclockToUtc(endLocal);
  return { dayStartUtc, dayEndUtc };
}

/**
 * Format a date in the app timezone.
 */
export function formatInAppTz(
  input: Date | string,
  opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const d = asDate(input);
  return new Intl.DateTimeFormat("ja-JP", { timeZone: APP_TZ, ...opts }).format(d);
}

/**
 * Utility: whether the given instant is already past (UTC-based).
 */
export function isPast(input: Date | string): boolean {
  return asDate(input).getTime() < Date.now();
}
