export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { store } from '../../../_store';
import { readUserFromCookie } from '@/lib/auth-legacy';
import { loadDB } from '@/lib/mockdb';
import { APP_TZ, localInputToUTC } from '@/lib/time';

const toUtcFromLocalString = (value: string, tz: string = APP_TZ) => {
  const normalized = value.trim().replace(' ', 'T');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) throw new Error(`Invalid date string: ${value}`);
  const [, day, hm] = match;
  return localInputToUTC(`${day}T${hm}`, tz);
};

const localDayRange = (yyyyMmDd: string, tz: string = APP_TZ) => {
  const start = toUtcFromLocalString(`${yyyyMmDd}T00:00`, tz);
  const end = toUtcFromLocalString(`${yyyyMmDd}T24:00`, tz);
  return { start, end };
};

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const groupSlug = params.slug?.toLowerCase();
  const deviceSlug = String(body.device || '').toLowerCase();
  const start = String(body.start || '');
  const end = String(body.end || '');
  const purpose = String(body.purpose || '');

  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const group = store.findGroupBySlug(groupSlug);
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

  const device = store.findDevice(groupSlug, deviceSlug);
  if (!device) return NextResponse.json({ error: 'device not found' }, { status: 404 });

  if (!start || !end) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
  }
  try {
    const startUtc = toUtcFromLocalString(start);
    const endUtc = toUtcFromLocalString(end);
    if (endUtc.getTime() <= startUtc.getTime()) {
      return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
  }

  const reservation = store.createReservation({
    groupSlug,
    deviceId: device.id,
    start,
    end,
    purpose,
    user: me.email,
    userName: me.name || me.email,
  });

  return NextResponse.json({ id: reservation.id }, { status: 201 });
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const deviceSlug = url.searchParams.get('deviceSlug');
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const group = store.findGroupBySlug(params.slug?.toLowerCase());
  if (!group) return NextResponse.json({ data: [] }, { status: 200 });
  let list = store.listReservationsByGroup(params.slug);
  if (deviceSlug) {
    list = list.filter((r: any) => r.deviceSlug === deviceSlug || r.deviceId === deviceSlug);
  }
  if (date) {
    const { start, end } = localDayRange(date);
    list = list.filter((r: any) => {
      const startAt = new Date(r.start);
      const endAt = new Date(r.end);
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return false;
      return !(endAt <= start || startAt >= end);
    });
  } else {
    if (fromParam) {
      const fromDate = (() => {
        const parsed = new Date(fromParam);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        try {
          return toUtcFromLocalString(fromParam);
        } catch {
          return null;
        }
      })();
      if (fromDate) {
        list = list.filter((r: any) => new Date(r.end) > fromDate);
      }
    }
    if (toParam) {
      const toDate = (() => {
        const parsed = new Date(toParam);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        try {
          return toUtcFromLocalString(toParam);
        } catch {
          return null;
        }
      })();
      if (toDate) {
        list = list.filter((r: any) => new Date(r.start) < toDate);
      }
    }
  }
  const db = loadDB();
  const mapped = list.map((r: any) => {
    const u = (db.users || []).find((x: any) => x.email === r.user);
    return { ...r, userName: u?.name || r.userName || r.user };
  });
  return NextResponse.json({ data: mapped }, { status: 200 });
}
