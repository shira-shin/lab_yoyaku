export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { isGroupAdmin } from '@/lib/duties/permissions';

function parseDate(input: unknown) {
  if (!input) return null;
  const value = new Date(String(input));
  return Number.isNaN(value.getTime()) ? null : value;
}

function parseWeekdays(value: unknown) {
  if (!Array.isArray(value)) return [];
  const items = value
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6);
  return Array.from(new Set(items));
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .filter((v) => v.length > 0);
}

export async function POST(req: Request) {
  try {
    const me = await readUserFromCookie();
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const typeId = String((body as any)?.typeId || '').trim();
    if (!typeId) {
      return NextResponse.json({ error: 'typeId is required' }, { status: 400 });
    }

    const dutyType = await prisma.dutyType.findUnique({
      where: { id: typeId },
      include: { group: { include: { members: true } } },
    });
    if (!dutyType) {
      return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
    }

    if (!isGroupAdmin(dutyType.group, me.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const startDate = parseDate((body as any)?.startDate);
    const endDate = parseDate((body as any)?.endDate);
    if (!startDate || !endDate || endDate < startDate) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
    }

    const byWeekday = parseWeekdays((body as any)?.byWeekday);
    if (byWeekday.length === 0) {
      return NextResponse.json({ error: 'byWeekday is required' }, { status: 400 });
    }

    const slotsPerDayRaw = Number((body as any)?.slotsPerDay ?? 1);
    const slotsPerDay = Number.isInteger(slotsPerDayRaw) && slotsPerDayRaw > 0 ? slotsPerDayRaw : 1;
    const includeMemberIds = parseStringArray((body as any)?.includeMemberIds);
    const excludeMemberIds = parseStringArray((body as any)?.excludeMemberIds);
    const avoidConsecutive = Boolean((body as any)?.avoidConsecutive ?? true);

    const created = await prisma.dutyRule.create({
      data: {
        typeId: dutyType.id,
        startDate,
        endDate,
        byWeekday,
        slotsPerDay,
        includeMemberIds,
        excludeMemberIds,
        avoidConsecutive,
      },
      select: {
        id: true,
        typeId: true,
        startDate: true,
        endDate: true,
        byWeekday: true,
        slotsPerDay: true,
        includeMemberIds: true,
        excludeMemberIds: true,
        avoidConsecutive: true,
      },
    });

    return NextResponse.json({ dutyRule: created }, { status: 201 });
  } catch (error) {
    console.error('create duty rule failed', error);
    return NextResponse.json({ error: 'create duty rule failed' }, { status: 500 });
  }
}
