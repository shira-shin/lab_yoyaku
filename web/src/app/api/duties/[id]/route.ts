export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActorByEmail, getGroupAndRole, canManageDuties } from '@/lib/perm';
import { z } from 'zod';

const Body = z.object({
  assigneeId: z.string().nullable().optional(),
  locked: z.boolean().optional(),
  done: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const assignment = await prisma.dutyAssignment.findUnique({
      where: { id: params.id },
      select: { id: true, groupId: true, group: { select: { slug: true, dutyManagePolicy: true } } },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const group = assignment.group;
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    const ctx = await getGroupAndRole(group.slug, me.id);
    if (!ctx || !canManageDuties(group.dutyManagePolicy, ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = Body.parse(await req.json());
    const updated = await prisma.dutyAssignment.update({
      where: { id: params.id },
      data: body,
      include: { assignee: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('update duty assignment failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'update duty assignment failed' }, { status: 500 });
  }
}
