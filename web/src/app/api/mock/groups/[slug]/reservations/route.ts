export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { store } from '../../../_store';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';
import { dayRangeUtc, localPartsToUtc, localStringToUtcDate } from '@/lib/time';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const groupSlug = params.slug?.toLowerCase();
  const deviceSlug = String(body.device || '').toLowerCase();
  const date = String(body.date || '').trim();
  const endDate = String(body.endDate || '').trim();
  const start = String(body.start || body.startTime || '').trim();
  const end = String(body.end || body.endTime || '').trim();
  const purpose = String(body.purpose || '');

  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const group = store.findGroupBySlug(groupSlug);
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

  const device = store.findDevice(groupSlug, deviceSlug);
  if (!device) return NextResponse.json({ error: 'device not found' }, { status: 404 });

  const toParts = (value: string, fallbackDate?: string) => {
    const normalized = value.replace('T', ' ').trim();
    const [datePart, timePart] = normalized.split(/\s+/);
    if (datePart && timePart) return { date: datePart, time: timePart };
    if (fallbackDate && value && !value.includes('T') && !value.includes(' ')) {
      return { date: fallbackDate, time: value };
    }
    return null;
  };

  const startParts = toParts(start, date);
  const endParts = toParts(end, endDate || date);

  if (!startParts || !endParts) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
  }

  const startAt = localPartsToUtc(startParts.date, startParts.time);
  const endAt = localPartsToUtc(endParts.date, endParts.time);

  if (endAt <= startAt) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
  }

  const reservation = store.createReservation({
    groupSlug,
    deviceId: device.id,
    start: startAt.toISOString(),
    end: endAt.toISOString(),
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
    const { startUtc, endUtc } = dayRangeUtc(date);
    list = list.filter((r: any) => {
      const startAt = new Date(r.start);
      const endAt = new Date(r.end);
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return false;
      return !(endAt <= startUtc || startAt >= endUtc);
    });
  } else {
    if (fromParam) {
      const fromDate = (() => {
        const parsed = new Date(fromParam);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        try {
          return localStringToUtcDate(fromParam);
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
          return localStringToUtcDate(toParam);
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
