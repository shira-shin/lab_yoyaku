export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActorByEmail, getGroupAndRole, canManageDuties } from '@/lib/perm';
import { z } from '@/lib/zod-shim';

const Body = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'MEMBERS_ONLY']).optional(),
  kind: z.enum(['DAY_SLOT', 'TIME_RANGE']).optional(),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const ctx = await getGroupAndRole(params.slug, me.id);
    if (!ctx || !canManageDuties(ctx.group.dutyManagePolicy, ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = Body.parse(await req.json());
    const created = await prisma.dutyType.create({
      data: {
        name: body.name,
        color: body.color ?? undefined,
        visibility: body.visibility ?? 'PUBLIC',
        kind: body.kind ?? 'DAY_SLOT',
        group: { connect: { id: ctx.group.id } },
      },
      select: { id: true, name: true, kind: true, color: true, visibility: true },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('create duty type failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'create duty type failed' }, { status: 500 });
  }
}
