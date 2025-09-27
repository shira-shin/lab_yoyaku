export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { isGroupAdmin } from '@/lib/duties/permissions';
import { assignMembersToSlots } from '@/utils/duty/assign';

type DutyVisibility = 'PUBLIC' | 'MEMBERS_ONLY';

function normalizeSlug(value: string | string[] | undefined) {
  if (!value) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').trim().toLowerCase();
}

function parseDate(input: unknown) {
  if (!input) return null;
  const value = new Date(String(input));
  return Number.isNaN(value.getTime()) ? null : value;
}

function keyOf(date: Date, slotIndex: number) {
  return `${date.toISOString()}#${slotIndex}`;
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const me = await readUserFromCookie();
    if (!me?.email) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const slug = normalizeSlug(params?.slug);
    if (!slug) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      include: { members: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    if (!isGroupAdmin(group, me.email)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const from = parseDate((body as any)?.from);
    const to = parseDate((body as any)?.to);
    if (!from || !to || to < from) {
      return NextResponse.json({ error: 'invalid range' }, { status: 400 });
    }

    const typeIdsRaw = (body as any)?.typeIds;
    const typeIds = Array.isArray(typeIdsRaw)
      ? typeIdsRaw.map((v: unknown) => String(v || '').trim()).filter((v: string) => v.length > 0)
      : undefined;

    const dutyTypes = await prisma.dutyType.findMany({
      where: {
        groupId: group.id,
        ...(typeIds && typeIds.length > 0 ? { id: { in: typeIds } } : {}),
      },
      include: { rules: true },
    });

    if (dutyTypes.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    const memberEmails = Array.from(
      new Set([group.hostEmail, ...group.members.map((member) => member.email)])
    );

    const users = memberEmails.length
      ? await prisma.user.findMany({
          where: { email: { in: memberEmails } },
          select: { id: true, email: true },
        })
      : [];

    const members = users.map((user) => ({ id: user.id }));
    const memberIdSet = new Set(members.map((m) => m.id));

    let created = 0;

    for (const dutyType of dutyTypes) {
      if (dutyType.rules.length === 0) continue;

      const existingAssignments = await prisma.dutyAssignment.findMany({
        where: {
          groupId: group.id,
          typeId: dutyType.id,
          date: { gte: from, lte: to },
        },
      });
      const existingMap = new Map<string, (typeof existingAssignments)[number]>();
      for (const assignment of existingAssignments) {
        existingMap.set(keyOf(assignment.date, assignment.slotIndex), assignment);
      }

      const includeIds = new Set<string>();
      const excludeIds = new Set<string>();
      let avoidConsecutive = false;
      for (const rule of dutyType.rules) {
        rule.includeMemberIds.forEach((id) => includeIds.add(id));
        rule.excludeMemberIds.forEach((id) => excludeIds.add(id));
        if (rule.avoidConsecutive !== false) {
          avoidConsecutive = true;
        }
      }

      let targetMembers = members.filter((member) => memberIdSet.has(member.id));
      if (includeIds.size > 0) {
        targetMembers = targetMembers.filter((member) => includeIds.has(member.id));
      }
      if (excludeIds.size > 0) {
        targetMembers = targetMembers.filter((member) => !excludeIds.has(member.id));
      }

      if (targetMembers.length === 0) {
        continue;
      }

      const slots: { date: Date; slotIndex: number; locked: boolean; assigneeId?: string }[] = [];

      for (const rule of dutyType.rules) {
        const start = new Date(Math.max(rule.startDate.getTime(), from.getTime()));
        const end = new Date(Math.min(rule.endDate.getTime(), to.getTime()));
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);
        if (end < start) continue;

        for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const weekday = cursor.getUTCDay();
          if (!rule.byWeekday.includes(weekday)) continue;
          for (let slotIndex = 0; slotIndex < rule.slotsPerDay; slotIndex++) {
            const day = new Date(cursor);
            const key = keyOf(day, slotIndex);
            const existing = existingMap.get(key);
            slots.push({
              date: day,
              slotIndex,
              locked: existing?.locked ?? false,
              assigneeId: existing?.assigneeId ?? undefined,
            });
          }
        }
      }

      if (slots.length === 0) {
        continue;
      }

      const countsRaw = await prisma.dutyAssignment.groupBy({
        by: ['assigneeId'],
        where: { groupId: group.id, typeId: dutyType.id, assigneeId: { not: null } },
        _count: { _all: true },
      });
      const countMap = new Map<string, number>();
      for (const row of countsRaw) {
        if (row.assigneeId) {
          countMap.set(row.assigneeId, row._count._all);
        }
      }

      const assigned = assignMembersToSlots(targetMembers, slots, countMap, {
        avoidConsecutive,
      });

      for (const slot of assigned) {
        if (slot.locked && slot.assigneeId) {
          continue;
        }
        const key = keyOf(slot.date, slot.slotIndex);
        const existing = existingMap.get(key);
        if (existing?.locked) {
          continue;
        }
        await prisma.dutyAssignment.upsert({
          where: {
            groupId_typeId_date_slotIndex: {
              groupId: group.id,
              typeId: dutyType.id,
              date: slot.date,
              slotIndex: slot.slotIndex,
            },
          },
          update: { assigneeId: slot.assigneeId ?? null },
          create: {
            groupId: group.id,
            typeId: dutyType.id,
            date: slot.date,
            slotIndex: slot.slotIndex,
            assigneeId: slot.assigneeId ?? null,
          },
        });
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error('generate duties failed', error);
    return NextResponse.json({ error: 'generate duties failed' }, { status: 500 });
  }
}
