import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { dayRangeInUtc } from '@/lib/time';

export const dynamic = 'force-dynamic';

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

  let dayStartUtc: Date;
  let dayEndUtc: Date;
  try {
    const { dayStartUtc: start, dayEndUtc: end } = dayRangeInUtc(day, tz);
    dayStartUtc = start;
    dayEndUtc = new Date(end.getTime() - 1);
  } catch {
    return NextResponse.json({ error: 'INVALID_DATE' }, { status: 400 });
  }

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
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const data = reservations.map((reservation) => ({
    id: reservation.id,
    deviceId: reservation.deviceId,
    deviceName: reservation.device?.name ?? null,
    deviceSlug: reservation.device?.slug ?? null,
    startsAtUTC: reservation.start.toISOString(),
    endsAtUTC: reservation.end.toISOString(),
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    purpose: reservation.purpose,
    reminderMinutes: reservation.reminderMinutes,
    userEmail: reservation.userEmail,
    userName: reservation.user?.name ?? reservation.userName ?? null,
    user: reservation.user
      ? {
          id: reservation.user.id,
          name: reservation.user.name ?? null,
          email: reservation.user.email ?? reservation.userEmail ?? null,
        }
      : null,
  }));

  return NextResponse.json({ data });
}
