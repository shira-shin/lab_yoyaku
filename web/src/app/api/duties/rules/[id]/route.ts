export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { auth } from '@/lib/auth';
import { getActorByEmail, getGroupAndRole, isAdmin } from '@/lib/perm';

function parseDate(input: unknown) {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  const value = new Date(String(input));
  if (Number.isNaN(value.getTime())) return undefined;
  return value;
}

function parseWeekdays(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6);
  return Array.from(new Set(items));
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((v) => String(v || '').trim())
    .filter((v) => v.length > 0);
}

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  return undefined;
}

function parseTimeString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const str = String(value).trim();
  const matched = str.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!matched) return undefined;
  const [, h, m] = matched;
  return `${h.padStart(2, '0')}:${m}`;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const rule = await prisma.dutyRule.findUnique({
      where: { id: params.id },
      include: { type: { include: { group: { select: { slug: true } } } } },
    });
    if (!rule) {
      return NextResponse.json({ error: 'duty rule not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(rule.type.group.slug, me.id);
    if (!ctx || !isAdmin(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: any = {};

    if ((body as any)?.startDate !== undefined) {
      const value = parseDate((body as any).startDate);
      if (!value) {
        return NextResponse.json({ error: 'invalid startDate' }, { status: 400 });
      }
      updates.startDate = value;
    }

    if ((body as any)?.endDate !== undefined) {
      const value = parseDate((body as any).endDate);
      if (!value) {
        return NextResponse.json({ error: 'invalid endDate' }, { status: 400 });
      }
      updates.endDate = value;
    }

    if (updates.startDate && updates.endDate && updates.endDate < updates.startDate) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
    }

    const weekdays = parseWeekdays((body as any)?.byWeekday);
    if (weekdays) {
      if (weekdays.length === 0) {
        return NextResponse.json({ error: 'byWeekday cannot be empty' }, { status: 400 });
      }
      updates.byWeekday = weekdays;
    }

    if ((body as any)?.slotsPerDay !== undefined) {
      const raw = Number((body as any).slotsPerDay);
      if (!Number.isInteger(raw) || raw <= 0) {
        return NextResponse.json({ error: 'slotsPerDay must be positive integer' }, { status: 400 });
      }
      updates.slotsPerDay = raw;
    }

    const includeMemberIds = parseStringArray((body as any)?.includeMemberIds);
    if (includeMemberIds) {
      updates.includeMemberIds = includeMemberIds;
    }
    const excludeMemberIds = parseStringArray((body as any)?.excludeMemberIds);
    if (excludeMemberIds) {
      updates.excludeMemberIds = excludeMemberIds;
    }

    const avoidConsecutive = parseBoolean((body as any)?.avoidConsecutive);
    if (avoidConsecutive !== undefined) {
      updates.avoidConsecutive = avoidConsecutive;
    }

    const startTimeValue = parseTimeString((body as any)?.startTime);
    if (startTimeValue !== undefined) {
      if (rule.type.kind === 'TIME_RANGE') {
        if (!startTimeValue) {
          return NextResponse.json({ error: 'startTime is required' }, { status: 400 });
        }
        updates.startTime = startTimeValue;
      } else {
        updates.startTime = null;
      }
    }

    const endTimeValue = parseTimeString((body as any)?.endTime);
    if (endTimeValue !== undefined) {
      if (rule.type.kind === 'TIME_RANGE') {
        if (!endTimeValue) {
          return NextResponse.json({ error: 'endTime is required' }, { status: 400 });
        }
        updates.endTime = endTimeValue;
      } else {
        updates.endTime = null;
      }
    }

    const disabled = parseBoolean((body as any)?.disabled);
    if (disabled !== undefined) {
      updates.disabled = disabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ dutyRule: rule });
    }

    const startTimeForValidation =
      updates.startTime ?? (rule.type.kind === 'TIME_RANGE' ? rule.startTime : null);
    const endTimeForValidation =
      updates.endTime ?? (rule.type.kind === 'TIME_RANGE' ? rule.endTime : null);
    if (rule.type.kind === 'TIME_RANGE' && startTimeForValidation && endTimeForValidation) {
      const startMinutes = Number(startTimeForValidation.slice(0, 2)) * 60 + Number(startTimeForValidation.slice(3, 5));
      const endMinutes = Number(endTimeForValidation.slice(0, 2)) * 60 + Number(endTimeForValidation.slice(3, 5));
      if (endMinutes <= startMinutes) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }
    }

    if (updates.startDate && !updates.endDate) {
      if (rule.endDate < updates.startDate) {
        return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
      }
    }
    if (updates.endDate && !updates.startDate) {
      if (updates.endDate < rule.startDate) {
        return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
      }
    }

    await prisma.dutyRule.update({ where: { id: rule.id }, data: updates });

    const refreshed = await prisma.dutyRule.findUnique({
      where: { id: rule.id },
      select: {
        id: true,
        typeId: true,
        startDate: true,
        endDate: true,
        byWeekday: true,
        slotsPerDay: true,
        startTime: true,
        endTime: true,
        includeMemberIds: true,
        excludeMemberIds: true,
        avoidConsecutive: true,
        disabled: true,
      },
    });

    return NextResponse.json({ dutyRule: refreshed });
  } catch (error) {
    console.error('update duty rule failed', error);
    return NextResponse.json({ error: 'update duty rule failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const rule = await prisma.dutyRule.findUnique({
      where: { id: params.id },
      include: { type: { include: { group: { select: { slug: true } } } } },
    });
    if (!rule) {
      return NextResponse.json({ error: 'duty rule not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(rule.type.group.slug, me.id);
    if (!ctx || !isAdmin(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await prisma.dutyRule.delete({ where: { id: rule.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('delete duty rule failed', error);
    return NextResponse.json({ error: 'delete duty rule failed' }, { status: 500 });
  }
}
