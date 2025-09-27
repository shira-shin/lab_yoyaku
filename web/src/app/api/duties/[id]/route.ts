export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { canManageDuties } from '@/lib/duties/permissions';

function parseBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const str = String(value).trim().toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  return undefined;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await readUserFromCookie();
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.dutyAssignment.findUnique({
      where: { id: params.id },
      include: {
        group: { include: { members: true } },
        type: { select: { id: true, name: true, color: true, visibility: true } },
      },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'duty assignment not found' }, { status: 404 });
    }

    if (!canManageDuties(assignment.group, me.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: { assigneeId?: string | null; locked?: boolean; done?: boolean } = {};

    if ((body as any)?.assigneeId !== undefined) {
      const raw = (body as any).assigneeId;
      const value = raw === null || raw === '' ? null : String(raw);
      if (value) {
        const memberEmails = Array.from(
          new Set([assignment.group.hostEmail, ...assignment.group.members.map((member) => member.email)])
        );
        const members = memberEmails.length
          ? await prisma.user.findMany({ where: { email: { in: memberEmails } }, select: { id: true } })
          : [];
        const allowed = new Set(members.map((member) => member.id));
        if (!allowed.has(value)) {
          return NextResponse.json({ error: 'assignee not member' }, { status: 400 });
        }
      }
      updates.assigneeId = value;
    }

    const locked = parseBoolean((body as any)?.locked);
    if (locked !== undefined) {
      updates.locked = locked;
    }

    const done = parseBoolean((body as any)?.done);
    if (done !== undefined) {
      updates.done = done;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ duty: assignment });
    }

    const updated = await prisma.dutyAssignment.update({
      where: { id: assignment.id },
      data: updates,
      include: {
        type: { select: { id: true, name: true, color: true, visibility: true } },
      },
    });

    return NextResponse.json({
      duty: {
        id: updated.id,
        groupId: updated.groupId,
        typeId: updated.typeId,
        date: updated.date.toISOString(),
        slotIndex: updated.slotIndex,
        locked: updated.locked,
        done: updated.done,
        assigneeId: updated.assigneeId,
        type: updated.type,
      },
    });
  } catch (error) {
    console.error('update duty assignment failed', error);
    return NextResponse.json({ error: 'update duty assignment failed' }, { status: 500 });
  }
}
