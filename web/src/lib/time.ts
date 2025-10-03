// web/src/lib/time.ts
import { addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/** App canonical timezone (server + client). */
export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

/** Normalize incoming value to Date. */
function asDate(input: Date | string): Date {
  if (input instanceof Date) return input;
  // Accept "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm" as wall-clock strings.
  const normalized = input.trim().replace(" ", "T");
  return new Date(normalized);
}

/** Convert a wall-clock time in APP_TZ to the corresponding UTC instant. */
export function localWallclockToUtc(input: Date | string): Date {
  return fromZonedTime(asDate(input), APP_TZ);
}

/** Convert a UTC instant to a zoned Date for display/formatting. */
export function utcToZoned(input: Date | string): Date {
  return toZonedTime(asDate(input), APP_TZ);
}

/** Format a date in the app timezone (ja-JP by default). */
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

/** Whether the given instant (UTC) is already past. */
export function isPast(input: Date | string): boolean {
  return asDate(input).getTime() < Date.now();
}

/** Given YYYY-MM-DD (local APP_TZ), return the UTC window [start, end). */
export function dayRangeInUtc(dateStr: string): {
  dayStartUtc: Date;
  dayEndUtc: Date;
} {
  const startLocal = new Date(`${dateStr}T00:00:00`);
  const endLocal = addDays(startLocal, 1);
  return {
    dayStartUtc: localWallclockToUtc(startLocal),
    dayEndUtc: localWallclockToUtc(endLocal),
  };
}

/* -----------------------------
 * Legacy aliases (for backward compatibility)
 * ----------------------------- */

/** Legacy: previously imported as `toUTC` throughout the app. */
export const toUTC = localWallclockToUtc;

/** Legacy: previously imported as `formatInTZ` throughout the app. */
export const formatInTZ = formatInAppTz;

/** Optional convenience aliases used in some code paths. */
export const toZoned = utcToZoned;
export const dayWindowUTC = dayRangeInUtc;
