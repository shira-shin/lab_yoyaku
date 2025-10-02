import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";

export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

// "2025-10-11 13:00" / "2025-10-11T13:00" をローカル(=APP_TZ)としてUTC Dateに
export function localStringToUtcDate(s: string): Date {
  const normalized = s.replace("T", " "); // datetime-local/文字列の両対応
  return zonedTimeToUtc(normalized, APP_TZ);
}

// UTC Date をローカル(=APP_TZ)の "yyyy-MM-dd HH:mm" 文字列に
export function utcDateToLocalString(d: Date): string {
  return format(utcToZonedTime(d, APP_TZ), "yyyy-MM-dd HH:mm", { timeZone: APP_TZ });
}

// ローカル日付の 1 日の境界
export function localDayRange(yyyyMmDd: string) {
  const start = zonedTimeToUtc(`${yyyyMmDd} 00:00`, APP_TZ);
  const end   = zonedTimeToUtc(`${yyyyMmDd} 24:00`, APP_TZ); // [start, end) の半開区間
  return { start, end };
}
