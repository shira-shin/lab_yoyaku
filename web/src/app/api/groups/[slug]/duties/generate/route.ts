export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActorByEmail, getGroupAndRole, isAdmin } from '@/lib/perm';
import { assignMembersToSlots } from '@/utils/duty/assign';
import { z } from '@/lib/zod-shim';

const Body = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  typeIds: z.array(z.string()).optional(),
  seed: z.number().optional(),
});

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const ctx = await getGroupAndRole(params.slug, me.id);
    if (!ctx || !isAdmin(ctx.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { from, to, typeIds, seed } = Body.parse(await req.json());

    const types = await prisma.dutyType.findMany({
      where: { groupId: ctx.group.id, ...(typeIds ? { id: { in: typeIds } } : {}) },
      include: { rules: { where: { disabled: false } } },
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId: ctx.group.id, userId: { not: null } },
      select: { userId: true },
    });
    const allUserIds = members.map((m) => m.userId!).filter(Boolean);

    let created = 0;

    for (const type of types) {
      const agg = await prisma.dutyAssignment.groupBy({
        by: ['assigneeId'],
        where: { groupId: ctx.group.id, typeId: type.id, assigneeId: { not: null } },
        _count: { _all: true },
      });
      const count = new Map<string, number>();
      agg.forEach((row) => {
        if (row.assigneeId) {
          count.set(row.assigneeId, row._count._all);
        }
      });

      const includeIds = new Set<string>(type.rules.flatMap((rule) => rule.includeMemberIds));
      const excludeIds = new Set<string>(type.rules.flatMap((rule) => rule.excludeMemberIds));
      let targets = allUserIds.filter((id) => !excludeIds.has(id));
      if (includeIds.size > 0) {
        targets = targets.filter((id) => includeIds.has(id));
      }
      const memberObjs = targets.map((id) => ({ id }));

      const slots: { date: Date; slotIndex: number; locked: boolean; assigneeId?: string }[] = [];

      for (const rule of type.rules) {
        const start = new Date(Math.max(+rule.startDate, +from));
        const end = new Date(Math.min(+rule.endDate, +to));
        for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const day = new Date(cursor);
          const weekday = day.getUTCDay();
          if (type.kind === 'DAY_SLOT') {
            if (!rule.byWeekday.includes(weekday)) continue;
            for (let i = 0; i < rule.slotsPerDay; i += 1) {
              const existing = await prisma.dutyAssignment.findUnique({
                where: {
                  groupId_typeId_date_slotIndex: {
                    groupId: ctx.group.id,
                    typeId: type.id,
                    date: new Date(day),
                    slotIndex: i,
                  },
                },
                select: { locked: true, assigneeId: true },
              });
              slots.push({
                date: new Date(day),
                slotIndex: i,
                locked: existing?.locked ?? false,
                assigneeId: existing?.assigneeId ?? undefined,
              });
            }
          } else {
            if (rule.byWeekday.length && !rule.byWeekday.includes(weekday)) continue;
            const existing = await prisma.dutyAssignment.findUnique({
              where: {
                groupId_typeId_date_slotIndex: {
                  groupId: ctx.group.id,
                  typeId: type.id,
                  date: new Date(day),
                  slotIndex: 0,
                },
              },
              select: { locked: true, assigneeId: true },
            });
            slots.push({
              date: new Date(day),
              slotIndex: 0,
              locked: existing?.locked ?? false,
              assigneeId: existing?.assigneeId ?? undefined,
            });
          }
        }
      }

      if (memberObjs.length === 0 || slots.length === 0) {
        continue;
      }

      const assigned = assignMembersToSlots(memberObjs, slots, count, {
        avoidConsecutive: true,
        seed: seed ?? Date.now(),
      });

      for (const slot of assigned) {
        if (slot.locked && slot.assigneeId) continue;
        let startsAt: Date | undefined;
        let endsAt: Date | undefined;
        if (type.kind === 'TIME_RANGE') {
          const rule = type.rules.find((r) => r.startTime && r.endTime);
          if (rule) {
            const [sh, sm] = (rule.startTime as string).split(':').map(Number);
            const [eh, em] = (rule.endTime as string).split(':').map(Number);
            const base = new Date(slot.date);
            startsAt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), sh, sm));
            endsAt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), eh, em));
          }
        }
        await prisma.dutyAssignment.upsert({
          where: {
            groupId_typeId_date_slotIndex: {
              groupId: ctx.group.id,
              typeId: type.id,
              date: slot.date,
              slotIndex: slot.slotIndex,
            },
          },
          update: {
            assigneeId: slot.assigneeId ?? null,
            startsAt,
            endsAt,
          },
          create: {
            groupId: ctx.group.id,
            typeId: type.id,
            date: slot.date,
            slotIndex: slot.slotIndex,
            assigneeId: slot.assigneeId ?? null,
            startsAt,
            endsAt,
          },
        });
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error('generate duties failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'generate duties failed' }, { status: 500 });
  }
}
