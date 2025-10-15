export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { auth } from '@/lib/auth-legacy';
import { getActorByEmail, getGroupAndRole, canManageDuties } from '@/lib/perm';

function parseDate(input: unknown) {
  if (!input) return null;
  const value = new Date(String(input));
  return Number.isNaN(value.getTime()) ? null : value;
}

function parseDateTime(baseDate: Date, input: unknown) {
  if (input === undefined || input === null || input === '') return null;
  const raw = String(input).trim();
  const hm = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (hm) {
    const [, h, m] = hm;
    const dt = new Date(baseDate);
    dt.setUTCHours(Number(h), Number(m), 0, 0);
    return dt;
  }
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const typeId = String((body as any)?.typeId || '').trim();
    if (!typeId) {
      return NextResponse.json({ error: 'typeId is required' }, { status: 400 });
    }

    const dutyType = await prisma.dutyType.findUnique({
      where: { id: typeId },
      include: {
        group: {
          select: {
            id: true,
            slug: true,
            dutyManagePolicy: true,
            members: { select: { userId: true } },
          },
        },
      },
    });
    if (!dutyType) {
      return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(dutyType.group.slug, me.id);
    if (!ctx || !canManageDuties(dutyType.group.dutyManagePolicy, ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const date = parseDate((body as any)?.date);
    if (!date) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }
    date.setUTCHours(0, 0, 0, 0);

    let slotIndex = 0;
    if (dutyType.kind === 'DAY_SLOT') {
      const slotIndexRaw =
        (body as any)?.slotIndex === undefined ? 0 : Number((body as any)?.slotIndex);
      if (!Number.isInteger(slotIndexRaw) || slotIndexRaw < 0) {
        return NextResponse.json({ error: 'slotIndex must be non-negative integer' }, { status: 400 });
      }
      slotIndex = slotIndexRaw;
    }

    const rawAssignee = (body as any)?.assigneeId;
    const assigneeId = rawAssignee === null || rawAssignee === undefined || rawAssignee === '' ? null : String(rawAssignee);
    if (assigneeId) {
      const allowed = new Set(
        dutyType.group.members.map((member) => member.userId).filter((id): id is string => Boolean(id))
      );
      if (!allowed.has(assigneeId)) {
        return NextResponse.json({ error: 'assignee not member' }, { status: 400 });
      }
    }

    const startsAt =
      dutyType.kind === 'TIME_RANGE' ? parseDateTime(date, (body as any)?.startsAt) : null;
    const endsAt = dutyType.kind === 'TIME_RANGE' ? parseDateTime(date, (body as any)?.endsAt) : null;

    if (dutyType.kind === 'TIME_RANGE') {
      if (!startsAt || !endsAt || endsAt <= startsAt) {
        return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
      }
    }

    const existing = await prisma.dutyAssignment.findUnique({
      where: {
        groupId_typeId_date_slotIndex: {
          groupId: dutyType.groupId,
          typeId: dutyType.id,
          date,
          slotIndex,
        },
      },
      select: { id: true, locked: true, assigneeId: true },
    });

    if (existing?.locked && existing.assigneeId && existing.assigneeId !== assigneeId) {
      return NextResponse.json({ error: 'assignment is locked' }, { status: 409 });
    }

    const saved = await prisma.dutyAssignment.upsert({
      where: {
        groupId_typeId_date_slotIndex: {
          groupId: dutyType.groupId,
          typeId: dutyType.id,
          date,
          slotIndex,
        },
      },
      update: {
        assigneeId,
        startsAt: dutyType.kind === 'TIME_RANGE' ? startsAt : null,
        endsAt: dutyType.kind === 'TIME_RANGE' ? endsAt : null,
      },
      create: {
        groupId: dutyType.groupId,
        typeId: dutyType.id,
        date,
        slotIndex,
        startsAt: dutyType.kind === 'TIME_RANGE' ? startsAt : null,
        endsAt: dutyType.kind === 'TIME_RANGE' ? endsAt : null,
        assigneeId,
      },
      include: {
        type: { select: { id: true, name: true, color: true, visibility: true, kind: true } },
      },
    });

    return NextResponse.json({
      duty: {
        id: saved.id,
        groupId: saved.groupId,
        typeId: saved.typeId,
        date: saved.date.toISOString(),
        slotIndex: saved.slotIndex,
        locked: saved.locked,
        done: saved.done,
        assigneeId: saved.assigneeId,
        startsAt: saved.startsAt ? saved.startsAt.toISOString() : null,
        endsAt: saved.endsAt ? saved.endsAt.toISOString() : null,
        type: saved.type,
      },
    });
  } catch (error) {
    console.error('assign duty failed', error);
    return NextResponse.json({ error: 'assign duty failed' }, { status: 500 });
  }
}
