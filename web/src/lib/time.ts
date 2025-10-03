export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(tz: string) {
  const cached = formatterCache.get(tz);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatterCache.set(tz, formatter);
  return formatter;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsToRecord(parts: Intl.DateTimeFormatPart[]): ZonedParts {
  const map = new Map<string, number>();
  for (const part of parts) {
    if (part.type === "literal") continue;
    map.set(part.type, Number(part.value));
  }
  return {
    year: map.get("year") ?? 0,
    month: map.get("month") ?? 1,
    day: map.get("day") ?? 1,
    hour: map.get("hour") ?? 0,
    minute: map.get("minute") ?? 0,
    second: map.get("second") ?? 0,
  };
}

export function toZoned(dateUtc: Date, tz: string = APP_TZ): ZonedParts {
  const formatter = getFormatter(tz);
  const parts = formatter.formatToParts(dateUtc);
  return partsToRecord(parts);
}

function toUtcFromZonedParts(parts: ZonedParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
}

function parseTimeParts(timeStr: string) {
  const [hh = "0", mm = "0", ss = "0"] = timeStr.split(":");
  return { hour: Number(hh), minute: Number(mm), second: Number(ss) };
}

export function localPartsToUtc(dateStr: string, timeStr: string, tz: string = APP_TZ): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error("invalid date parts");
  }

  const { hour, minute, second } = parseTimeParts(timeStr);
  if ([hour, minute, second].some((value) => !Number.isFinite(value))) {
    throw new Error("invalid time parts");
  }

  // ベースとなる日付をUTCで作成し、指定TZでの表示値との差分を利用してUTCに補正
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const formatter = getFormatter(tz);
  const presented = partsToRecord(formatter.formatToParts(base));
  const presentedUtc = toUtcFromZonedParts(presented);
  const offsetMs = presentedUtc.getTime() - base.getTime();
  return new Date(base.getTime() - offsetMs);
}

export function localStringToUtcDate(value: string, tz: string = APP_TZ): Date {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("invalid datetime string");
  const normalized = trimmed.replace("T", " ");
  const [datePart, timePart = "00:00"] = normalized.split(/\s+/);
  return localPartsToUtc(datePart, timePart, tz);
}

export function formatInTz(dateUtc: Date, format: string, tz: string = APP_TZ): string {
  const zoned = toZoned(dateUtc, tz);
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");
  switch (format) {
    case "HH:mm":
      return `${pad(zoned.hour)}:${pad(zoned.minute)}`;
    case "yyyy-MM-dd":
      return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}`;
    case "yyyy-MM-dd HH:mm":
      return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)} ${pad(zoned.hour)}:${pad(zoned.minute)}`;
    default:
      return `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)} ${pad(zoned.hour)}:${pad(zoned.minute)}`;
  }
}

export function utcDateToLocalString(dateUtc: Date, tz: string = APP_TZ): string {
  return formatInTz(dateUtc, "yyyy-MM-dd HH:mm", tz);
}

export function dayRangeUtc(dateStr: string, tz: string = APP_TZ) {
  const startUtc = localPartsToUtc(dateStr, "00:00", tz);
  const endUtc = localPartsToUtc(dateStr, "24:00", tz);
  return { startUtc, endUtc };
}

export function localDayRange(dateStr: string, tz: string = APP_TZ) {
  const { startUtc, endUtc } = dayRangeUtc(dateStr, tz);
  return { start: startUtc, end: endUtc };
}

export function isPast(endUtc: Date): boolean {
  return endUtc.getTime() < Date.now();
}
