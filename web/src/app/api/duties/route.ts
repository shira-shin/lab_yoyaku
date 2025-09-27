export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { isGroupMember } from '@/lib/duties/permissions';

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: Request) {
  try {
    const me = await readUserFromCookie();
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get('groupSlug') || '').trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: 'groupSlug is required' }, { status: 400 });
    }

    const from = parseDate(searchParams.get('from'));
    const to = parseDate(searchParams.get('to'));
    if (!from || !to || to < from) {
      return NextResponse.json({ error: 'invalid range' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    if (!isGroupMember(group, me.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const includeParams = searchParams.getAll('include');
    const includeType = includeParams.includes('type');

    const assignments = await prisma.dutyAssignment.findMany({
      where: {
        groupId: group.id,
        date: { gte: from, lte: to },
      },
      include: includeType
        ? {
            type: {
              select: {
                id: true,
                name: true,
                color: true,
                visibility: true,
                kind: true,
              },
            },
          }
        : undefined,
      orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
    });

    const duties = assignments.map((assignment) => ({
      id: assignment.id,
      typeId: assignment.typeId,
      groupId: assignment.groupId,
      date: assignment.date.toISOString(),
      slotIndex: assignment.slotIndex,
      locked: assignment.locked,
      done: assignment.done,
      assigneeId: assignment.assigneeId,
      startsAt: assignment.startsAt ? assignment.startsAt.toISOString() : null,
      endsAt: assignment.endsAt ? assignment.endsAt.toISOString() : null,
      type: includeType
        ? assignment.type && {
            id: assignment.type.id,
            name: assignment.type.name,
            color: assignment.type.color,
            visibility: assignment.type.visibility,
            kind: assignment.type.kind,
          }
        : undefined,
    }));

    return NextResponse.json({ duties });
  } catch (error) {
    console.error('list duties failed', error);
    return NextResponse.json({ error: 'list duties failed' }, { status: 500 });
  }
}
