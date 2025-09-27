export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActorByEmail, isAdmin } from '@/lib/perm';
import { z } from '@/lib/zod-shim';

const Body = z.object({
  typeId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
  slotsPerDay: z.number().int().min(1).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  includeMemberIds: z.array(z.string()).optional(),
  excludeMemberIds: z.array(z.string()).optional(),
  avoidConsecutive: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const input = Body.parse(await req.json());
    const type = await prisma.dutyType.findUnique({
      where: { id: input.typeId },
      select: { groupId: true, kind: true },
    });
    if (!type) {
      return NextResponse.json({ error: 'type not found' }, { status: 404 });
    }

    const member = await prisma.groupMember.findFirst({
      where: { groupId: type.groupId, userId: me.id },
      select: { role: true },
    });
    if (!isAdmin(member?.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (type.kind === 'DAY_SLOT' && !(input.byWeekday && input.slotsPerDay)) {
      return NextResponse.json({ error: 'invalid rule for DAY_SLOT' }, { status: 400 });
    }
    if (type.kind === 'TIME_RANGE' && !(input.startTime && input.endTime)) {
      return NextResponse.json({ error: 'invalid rule for TIME_RANGE' }, { status: 400 });
    }

    const data = await prisma.dutyRule.create({
      data: {
        ...input,
        byWeekday: input.byWeekday ?? [],
        slotsPerDay: input.slotsPerDay ?? 1,
      },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('create duty rule failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'create duty rule failed' }, { status: 500 });
  }
}
