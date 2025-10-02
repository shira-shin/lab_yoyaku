import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getTimeZoneOffset(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const filled: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        filled[part.type] = Number(part.value);
      }
    }
    const asUTC = Date.UTC(
      filled.year ?? date.getUTCFullYear(),
      (filled.month ?? date.getUTCMonth() + 1) - 1,
      filled.day ?? date.getUTCDate(),
      filled.hour ?? 0,
      filled.minute ?? 0,
      filled.second ?? 0,
    );
    return (asUTC - date.getTime()) / 60000;
  } catch {
    return 0;
  }
}

function startOfDayInTimeZone(value: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if ([year, month, day].some((n) => !Number.isFinite(n))) return null;
  const utcMidnight = Date.UTC(year, month, day, 0, 0, 0, 0);
  const offsetMinutes = getTimeZoneOffset(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - offsetMinutes * 60 * 1000);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupSlug = (searchParams.get('groupSlug') || searchParams.get('group') || '').trim();
  const day = (searchParams.get('day') || searchParams.get('date') || '').trim();
  const tz = (searchParams.get('tz') || 'Asia/Tokyo').trim() || 'Asia/Tokyo';

  if (!groupSlug || !day) {
    return NextResponse.json({ error: 'MISSING' }, { status: 400 });
  }

  const group = await prisma.group.findFirst({
    where: { slug: { equals: groupSlug.toLowerCase(), mode: 'insensitive' } },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ data: [] });
  }

  const dayStartUtc = startOfDayInTimeZone(day, tz);
  if (!dayStartUtc) {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      device: { groupId: group.id },
      start: { lte: dayEndUtc },
      end: { gte: dayStartUtc },
    },
    orderBy: { start: 'asc' },
    include: {
      device: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const data = reservations.map((reservation) => ({
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceName: reservation.device?.name ?? null,
    deviceSlug: reservation.device?.slug ?? null,
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose,
    reminderMinutes: reservation.reminderMinutes,
    userEmail: reservation.userEmail,
    userName: reservation.userName,
  }));

  return NextResponse.json({ data });
}
