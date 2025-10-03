import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const DEFAULT_APP_TZ = "Asia/Tokyo";
const DEFAULT_LOCALE = "ja-JP";

type DateInput = Date | string;

function ensureDate(input: DateInput): Date {
  const value = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date input");
  }
  return value;
}

export function getAppTz(): string {
  return process.env.NEXT_PUBLIC_APP_TZ || process.env.NEXT_PUBLIC_TZ || DEFAULT_APP_TZ;
}

export const APP_TZ = getAppTz();

export function localWallclockToUtc(input: DateInput, tz: string = getAppTz()): Date {
  const base = ensureDate(input);
  const iso = format(base, "yyyy-MM-dd'T'HH:mm:ss");
  return fromZonedTime(iso, tz);
}

export function utcToZoned(input: DateInput, tz: string = getAppTz()): Date {
  const date = ensureDate(input);
  return toZonedTime(date, tz);
}

export function formatInAppTz(
  input: DateInput,
  fmt: Intl.DateTimeFormatOptions = {},
  tz: string = getAppTz(),
  locale: string = DEFAULT_LOCALE,
): string {
  const date = ensureDate(input);
  return new Intl.DateTimeFormat(locale, { timeZone: tz, ...fmt }).format(date);
}

export function toUTC(input: DateInput, tz?: string): Date {
  return localWallclockToUtc(input, tz ?? getAppTz());
}

export function formatInTZ(
  input: DateInput,
  tz: string = getAppTz(),
  opts: Intl.DateTimeFormatOptions = {},
  locale: string = DEFAULT_LOCALE,
): string {
  return formatInAppTz(input, opts, tz, locale);
}

export function dayRangeInUtc(yyyyMmDd: string, tz: string = getAppTz()) {
  const trimmed = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }

  const dayStartUtc = localWallclockToUtc(`${trimmed}T00:00:00`, tz);
  const dayEndUtc = addDays(dayStartUtc, 1);

  return { dayStartUtc, dayEndUtc };
}
