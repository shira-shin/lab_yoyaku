import { APP_TZ, utcToZoned } from '@/lib/time';

type Maybe<T> = T | null | undefined;

function firstTruthy<T>(...candidates: Maybe<T>[]) {
  for (const value of candidates) {
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
}

export type ReservationDto = {
  id?: string;
  deviceId?: string;
  deviceSlug?: string | null;
  deviceName?: string | null;
  startsAtUTC?: string;
  endsAtUTC?: string;
  purpose?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  note?: string | null;
  start?: string;
  end?: string;
  startAt?: string;
  endAt?: string;
  startUtc?: string;
  endUtc?: string;
  startAtUTC?: string;
  endAtUTC?: string;
  startsAt?: string;
  endsAt?: string;
  device?: {
    id?: string;
    slug?: string | null;
    name?: string | null;
  } | null;
};

export type NormalizedReservation = {
  id: string;
  deviceId: string;
  deviceSlug: string | null;
  deviceName: string | null;
  purpose: string | null;
  userEmail: string | null;
  userName: string | null;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
  startsAtUTC: string;
  endsAtUTC: string;
  startUtc: Date;
  endUtc: Date;
  start: Date;
  end: Date;
};

const isIsoLike = (value: unknown): value is string => typeof value === 'string' && value.length >= 10;

export function normalizeReservation(
  raw: ReservationDto | undefined,
  tz: string = APP_TZ,
): NormalizedReservation | null {
  if (!raw) return null;

  const startIso = firstTruthy(
    raw.startsAtUTC,
    raw.startAtUTC,
    raw.startAt,
    raw.startUtc,
    raw.start,
    raw.startsAt,
  );
  const endIso = firstTruthy(
    raw.endsAtUTC,
    raw.endAtUTC,
    raw.endAt,
    raw.endUtc,
    raw.end,
    raw.endsAt,
  );

  if (!isIsoLike(startIso) || !isIsoLike(endIso)) {
    return null;
  }

  const startUtc = new Date(startIso);
  const endUtc = new Date(endIso);
  if (Number.isNaN(startUtc.getTime()) || Number.isNaN(endUtc.getTime())) {
    return null;
  }

  const start = utcToZoned(startUtc, tz);
  const end = utcToZoned(endUtc, tz);

  const device = raw.device ?? {};
  const user = raw.user ?? null;
  const deviceId = firstTruthy(raw.deviceId, device.id);
  if (!deviceId) {
    return null;
  }

  const id = raw.id ?? '';
  if (!id) {
    return null;
  }

  return {
    id: String(id),
    deviceId: String(deviceId),
    deviceSlug: firstTruthy(raw.deviceSlug, device.slug) ?? null,
    deviceName: firstTruthy(raw.deviceName, device.name) ?? null,
    purpose: firstTruthy(raw.purpose, raw.note) ?? null,
    userEmail: firstTruthy(raw.userEmail, user?.email) ?? null,
    userName: firstTruthy(raw.userName, user?.name) ?? null,
    user: user
      ? {
          id: firstTruthy(user.id) ?? null,
          name: firstTruthy(user.name) ?? null,
          email: firstTruthy(user.email, raw.userEmail) ?? null,
        }
      : raw.userEmail || raw.userName
        ? {
            id: null,
            name: firstTruthy(raw.userName) ?? null,
            email: firstTruthy(raw.userEmail) ?? null,
          }
        : null,
    startsAtUTC: startUtc.toISOString(),
    endsAtUTC: endUtc.toISOString(),
    startUtc,
    endUtc,
    start,
    end,
  };
}

export function extractReservationItems(payload: any): ReservationDto[] {
  if (Array.isArray(payload?.items)) return payload.items as ReservationDto[];
  if (Array.isArray(payload?.data)) return payload.data as ReservationDto[];
  if (Array.isArray(payload?.reservations)) return payload.reservations as ReservationDto[];
  return [];
}

export function overlapsRange(
  reservation: NormalizedReservation,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  return reservation.endUtc > rangeStart && reservation.startUtc < rangeEnd;
}

