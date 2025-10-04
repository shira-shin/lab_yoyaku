const DEFAULT_LOCALE = 'ja-JP';
const UTC_ISO_Z_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ || 'Asia/Tokyo';

function ensureUtcDate(input: Date | string): Date {
  if (input instanceof Date) {
    const cloned = new Date(input.getTime());
    if (Number.isNaN(cloned.getTime())) {
      throw new Error('Invalid date input');
    }
    return cloned;
  }
  if (!UTC_ISO_Z_REGEX.test(input)) {
    throw new Error(`Require UTC ISO (Z): ${input}`);
  }
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid date input: ${input}`);
  }
  return value;
}

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function nextDateString(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + 1);
  return `${base.getUTCFullYear()}-${pad2(base.getUTCMonth() + 1)}-${pad2(base.getUTCDate())}`;
}

// ---- 1) datetime-local の文字列 'YYYY-MM-DDTHH:mm' を APP_TZ の壁時計として UTC Date へ
export function localInputToUTC(value: string, tz: string = APP_TZ): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  const [d, t] = value.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);

  const guessUtcMs = Date.UTC(y, m - 1, day, hh, mm, 0, 0);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(guessUtcMs));

  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);

  const ly = get('year');
  const lm = get('month');
  const ld = get('day');
  const lh = get('hour');
  const lmin = get('minute');
  const ls = get('second');

  const localWallMs = Date.UTC(ly, lm - 1, ld, lh, lmin, ls);
  const offsetMin = (localWallMs - guessUtcMs) / 60000;
  const trueUtcMs = Date.UTC(y, m - 1, day, hh, mm, 0, 0) - offsetMin * 60_000;
  return new Date(trueUtcMs);
}

// ---- 2) UTC(Date|ISO) を APP_TZ の Date へ（表示用）
export function utcToLocal(date: Date | string, tz: string = APP_TZ): Date {
  const utcDate = typeof date === 'string' ? ensureUtcDate(date) : ensureUtcDate(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(utcDate);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
}

// ---- 3) APIで返すDTOは常に Z 付き ISO
export function toUtcIsoZ(d: Date | string): string {
  const date = typeof d === 'string' ? ensureUtcDate(d) : ensureUtcDate(d);
  return new Date(date.getTime()).toISOString();
}

export function formatInTZ(
  input: Date | string,
  tz: string = APP_TZ,
  opts: Intl.DateTimeFormatOptions = {},
  locale: string = DEFAULT_LOCALE,
): string {
  const date = ensureUtcDate(input);
  return new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts }).format(date);
}

export function dayRangeInUtc(yyyyMmDd: string, tz: string = APP_TZ) {
  const trimmed = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }
  const dayStartUtc = localInputToUTC(`${trimmed}T00:00`, tz);
  const nextDay = nextDateString(trimmed);
  const dayEndUtc = localInputToUTC(`${nextDay}T00:00`, tz);
  return { dayStartUtc, dayEndUtc };
}

export function formatUtcInAppTz(
  isoZ: string,
  opt: Intl.DateTimeFormatOptions = {},
  locale: string = DEFAULT_LOCALE,
) {
  const date = ensureUtcDate(isoZ);
  const base: Intl.DateTimeFormatOptions = {
    timeZone: APP_TZ,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  const options: Intl.DateTimeFormatOptions = { ...base, ...opt };
  if (Object.keys(opt).length > 0) {
    if (!('month' in opt)) delete options.month;
    if (!('day' in opt)) delete options.day;
    if (!('hour' in opt)) delete options.hour;
    if (!('minute' in opt)) delete options.minute;
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function isPastUtc(isoZ: string) {
  const target = ensureUtcDate(isoZ);
  return target.getTime() < new Date().getTime();
}
