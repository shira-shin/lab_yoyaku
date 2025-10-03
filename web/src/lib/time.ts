export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

// Local Date -> UTC (based on APP_TZ)
export function toUTC(date: Date, tz: string = APP_TZ): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const values: any = {};
  parts.forEach(p => { if (p.type !== "literal") values[p.type] = parseInt(p.value, 10); });
  return new Date(Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second));
}

// UTC -> Local TZ Date
export function fromUTC(date: Date, tz: string = APP_TZ): Date {
  const iso = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(date);
  return new Date(iso);
}

// Formatter
export function formatInTZ(date: Date, tz: string = APP_TZ, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: tz, ...opts }).format(date);
}
