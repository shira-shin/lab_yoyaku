export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { canManageDuties } from '@/lib/duties/permissions';

function parseDate(input: unknown) {
  if (!input) return null;
  const value = new Date(String(input));
  return Number.isNaN(value.getTime()) ? null : value;
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

    if (!canManageDuties(dutyType.group, me.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const date = parseDate((body as any)?.date);
    if (!date) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 });
    }
    date.setUTCHours(0, 0, 0, 0);

    const slotIndexRaw = Number((body as any)?.slotIndex);
    if (!Number.isInteger(slotIndexRaw) || slotIndexRaw < 0) {
      return NextResponse.json({ error: 'slotIndex must be non-negative integer' }, { status: 400 });
    }

    const rawAssignee = (body as any)?.assigneeId;
    const assigneeId = rawAssignee === null || rawAssignee === undefined || rawAssignee === '' ? null : String(rawAssignee);
    if (assigneeId) {
      const memberEmails = Array.from(
        new Set([dutyType.group.hostEmail, ...dutyType.group.members.map((member) => member.email)])
      );
      const members = memberEmails.length
        ? await prisma.user.findMany({ where: { email: { in: memberEmails } }, select: { id: true } })
        : [];
      const allowed = new Set(members.map((member) => member.id));
      if (!allowed.has(assigneeId)) {
        return NextResponse.json({ error: 'assignee not member' }, { status: 400 });
      }
    }

    const existing = await prisma.dutyAssignment.findUnique({
      where: {
        groupId_typeId_date_slotIndex: {
          groupId: dutyType.groupId,
          typeId: dutyType.id,
          date,
          slotIndex: slotIndexRaw,
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
          slotIndex: slotIndexRaw,
        },
      },
      update: { assigneeId },
      create: {
        groupId: dutyType.groupId,
        typeId: dutyType.id,
        date,
        slotIndex: slotIndexRaw,
        assigneeId,
      },
      include: {
        type: { select: { id: true, name: true, color: true, visibility: true } },
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
        type: saved.type,
      },
    });
  } catch (error) {
    console.error('assign duty failed', error);
    return NextResponse.json({ error: 'assign duty failed' }, { status: 500 });
  }
}
