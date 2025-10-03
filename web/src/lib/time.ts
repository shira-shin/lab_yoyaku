export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

function getFormatter(tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error("Invalid date parts");
  }
  return { year: y, month: m, day: d };
}

function parseTime(timeStr: string) {
  const parts = timeStr.split(":").map((p) => Number(p));
  if (parts.length < 2) throw new Error("Invalid time parts");
  const [hour, minute, second] = parts;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error("Invalid time parts");
  }
  if (hour < 0 || hour > 24) throw new Error("Invalid hour value");
  if (hour === 24 && (minute !== 0 || (Number.isFinite(second) && second !== 0))) {
    throw new Error("Invalid time parts for 24:00");
  }
  if (minute < 0 || minute > 59) throw new Error("Invalid minute value");
  const sec = Number.isFinite(second) ? second : 0;
  if (sec < 0 || sec > 59) throw new Error("Invalid second value");
  const dayOffset = hour === 24 ? 1 : 0;
  return { hour: hour === 24 ? 0 : hour, minute, second: hour === 24 ? 0 : sec, dayOffset };
}

function mapParts(parts: Intl.DateTimeFormatPart[]) {
  const entries = parts
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)] as const);
  return Object.fromEntries(entries) as Record<string, number>;
}

export function localPartsToUtc(dateStr: string, timeStr: string, tz = APP_TZ): Date {
  const { year, month, day } = parseDate(dateStr);
  const { hour, minute, second, dayOffset } = parseTime(timeStr);
  const formatter = getFormatter(tz);
  const guess = new Date(Date.UTC(year, month - 1, day + dayOffset, hour, minute, second));
  const parts = mapParts(formatter.formatToParts(guess));
  const interpreted = Date.UTC(
    parts.year,
    (parts.month || 1) - 1,
    parts.day || 1,
    parts.hour || 0,
    parts.minute || 0,
    parts.second || 0,
  );
  const offset = interpreted - guess.getTime();
  return new Date(guess.getTime() - offset);
}

export function toZoned(dateUtc: Date, tz = APP_TZ) {
  const parts = mapParts(getFormatter(tz).formatToParts(dateUtc));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second ?? 0,
  };
}

export function formatInTz(dateUtc: Date, fmt: string, tz = APP_TZ): string {
  const z = toZoned(dateUtc, tz);
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const tokens: Record<string, string> = {
    yyyy: String(z.year),
    MM: pad(z.month),
    dd: pad(z.day),
    HH: pad(z.hour),
    mm: pad(z.minute),
    ss: pad(z.second),
  };
  if (fmt === "HH:mm") return `${tokens.HH}:${tokens.mm}`;
  if (fmt === "yyyy-MM-dd") return `${tokens.yyyy}-${tokens.MM}-${tokens.dd}`;
  if (fmt === "yyyy-MM-dd HH:mm") return `${tokens.yyyy}-${tokens.MM}-${tokens.dd} ${tokens.HH}:${tokens.mm}`;
  if (fmt === "yyyy-MM-dd HH:mm:ss") return `${tokens.yyyy}-${tokens.MM}-${tokens.dd} ${tokens.HH}:${tokens.mm}:${tokens.ss}`;
  return `${tokens.yyyy}-${tokens.MM}-${tokens.dd} ${tokens.HH}:${tokens.mm}`;
}

export function utcDateToLocalString(dateUtc: Date, fmt = "yyyy-MM-dd HH:mm", tz = APP_TZ): string {
  return formatInTz(dateUtc, fmt, tz);
}

export function localStringToUtcDate(input: string, tz = APP_TZ): Date {
  const normalized = input.trim().replace("T", " ");
  const [datePart, timePart = "00:00:00"] = normalized.split(/\s+/);
  if (!datePart || !timePart) throw new Error("Invalid datetime string");
  return localPartsToUtc(datePart, timePart, tz);
}

export function dayRangeUtc(dateStr: string, tz = APP_TZ) {
  const startUtc = localPartsToUtc(dateStr, "00:00", tz);
  const endUtc = localPartsToUtc(dateStr, "24:00", tz);
  return { startUtc, endUtc };
}

export function localDayRange(dateStr: string, tz = APP_TZ) {
  const { startUtc, endUtc } = dayRangeUtc(dateStr, tz);
  return { start: startUtc, end: endUtc };
}

export function isPast(endUtc: Date): boolean {
  return endUtc.getTime() < Date.now();
}
