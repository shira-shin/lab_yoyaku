import { addDays } from "date-fns";

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

function getTimeParts(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const values = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  };

  for (const part of parts) {
    if (part.type === "literal" || part.type === "dayPeriod") continue;
    const key = part.type as keyof typeof values;
    values[key] = Number.parseInt(part.value, 10);
  }

  return values;
}

function createUtcDateFromParts(parts: ReturnType<typeof getTimeParts>) {
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function getAppTz(): string {
  return process.env.NEXT_PUBLIC_APP_TZ || process.env.NEXT_PUBLIC_TZ || DEFAULT_APP_TZ;
}

export const APP_TZ = getAppTz();

export function localWallclockToUtc(input: DateInput, tz: string = getAppTz()): Date {
  const base = ensureDate(input);
  const zonedUtc = createUtcDateFromParts(getTimeParts(base, tz));
  const offset = zonedUtc.getTime() - base.getTime();
  return new Date(base.getTime() - offset);
}

export function utcToZoned(input: DateInput, tz: string = getAppTz()): Date {
  const date = ensureDate(input);
  const parts = getTimeParts(date, tz);
  const iso = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
  return new Date(iso);
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
