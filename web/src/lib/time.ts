import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";

export const APP_TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Tokyo";

const normalizeLocalInput = (value: string) => value.replace(" ", "T");

export const toUtc = (localIso: string) => zonedTimeToUtc(normalizeLocalInput(localIso), APP_TZ);

export const fromUtc = (value: Date | string | number) => {
  const date = value instanceof Date ? value : new Date(value);
  return utcToZonedTime(date, APP_TZ);
};

export const formatJp = (value: Date | string | number, fmt = "yyyy/MM/dd HH:mm") =>
  format(fromUtc(value), fmt, { timeZone: APP_TZ });

export const localStringToUtcDate = (value: string) => toUtc(value);

export const utcDateToLocalString = (value: Date | string | number) =>
  format(fromUtc(value), "yyyy-MM-dd HH:mm", { timeZone: APP_TZ });

export const localDayRange = (yyyyMmDd: string) => {
  const trimmed = yyyyMmDd.trim();
  const start = toUtc(`${trimmed}T00:00:00`);
  const end = toUtc(`${trimmed}T23:59:59.999`);
  return { start, end };
};
