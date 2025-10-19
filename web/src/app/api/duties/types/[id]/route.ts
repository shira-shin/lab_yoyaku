export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { auth } from '@/lib/auth-legacy';
import { getActorByEmail, getGroupAndRole, isAdmin } from '@/lib/perm';

type DutyVisibility = 'PUBLIC' | 'MEMBERS_ONLY';
type DutyKind = 'DAY_SLOT' | 'TIME_RANGE';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const dutyType = await prisma.dutyType.findUnique({
      where: { id: params.id },
      include: { group: { select: { slug: true } } },
    });
    if (!dutyType) {
      return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(dutyType.group.slug, me.id);
    if (!ctx || !isAdmin(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updates: { name?: string; color?: string; visibility?: DutyVisibility; kind?: DutyKind } = {};

    if ((body as any)?.name !== undefined) {
      const name = String((body as any).name || '').trim();
      if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
      }
      const duplicate = await prisma.dutyType.findFirst({
        where: { groupId: dutyType.groupId, name, id: { not: dutyType.id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: 'duty type already exists' }, { status: 409 });
      }
      updates.name = name;
    }

    if ((body as any)?.color !== undefined) {
      const color = String((body as any).color || '').trim();
      if (color) updates.color = color;
    }

    if ((body as any)?.visibility !== undefined) {
      const visibilityValue = String((body as any).visibility);
      if (visibilityValue === 'MEMBERS_ONLY' || visibilityValue === 'PUBLIC') {
        updates.visibility = visibilityValue as DutyVisibility;
      }
    }

    if ((body as any)?.kind !== undefined) {
      const kindValue = String((body as any).kind);
      if (kindValue === 'DAY_SLOT' || kindValue === 'TIME_RANGE') {
        updates.kind = kindValue as DutyKind;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.dutyType.update({ where: { id: dutyType.id }, data: updates });
    }

    const refreshed = await prisma.dutyType.findUnique({
      where: { id: dutyType.id },
      select: { id: true, groupId: true, name: true, color: true, visibility: true, kind: true },
    });

    return NextResponse.json({ dutyType: refreshed });
  } catch (error) {
    console.error('update duty type failed', error);
    return NextResponse.json({ error: 'update duty type failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const dutyType = await prisma.dutyType.findUnique({
      where: { id: params.id },
      include: { group: { select: { slug: true } } },
    });
    if (!dutyType) {
      return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(dutyType.group.slug, me.id);
    if (!ctx || !isAdmin(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await prisma.dutyType.delete({ where: { id: dutyType.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('delete duty type failed', error);
    return NextResponse.json({ error: 'delete duty type failed' }, { status: 500 });
  }
}
