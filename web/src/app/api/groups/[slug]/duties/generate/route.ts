export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { isGroupAdmin } from '@/lib/duties/permissions';
import { assignMembersToSlots } from '@/utils/duty/assign';

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

function normalizeSeed(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  const str = String(value).trim();
  if (str.length === 0) return undefined;
  const parsed = Number(str);
  if (!Number.isNaN(parsed)) return Math.floor(parsed);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function combineDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map((v) => Number(v));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const dt = new Date(date);
  dt.setUTCHours(hours, minutes, 0, 0);
  return dt;
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

    const seed = normalizeSeed((body as any)?.seed);

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
      const rules = dutyType.rules.filter((rule) => !rule.disabled);
      if (rules.length === 0) continue;

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

      const slots: {
        date: Date;
        slotIndex: number;
        locked: boolean;
        assigneeId?: string;
        startsAt?: Date | null;
        endsAt?: Date | null;
        allowedAssigneeIds?: string[];
        avoidConsecutive?: boolean;
      }[] = [];

      for (const rule of rules) {
        const includeIds = new Set(rule.includeMemberIds.filter((id) => memberIdSet.has(id)));
        const excludeIds = new Set(rule.excludeMemberIds.filter((id) => memberIdSet.has(id)));

        let eligibleMembers = members.filter((member) => memberIdSet.has(member.id));
        if (includeIds.size > 0) {
          eligibleMembers = eligibleMembers.filter((member) => includeIds.has(member.id));
        }
        if (excludeIds.size > 0) {
          eligibleMembers = eligibleMembers.filter((member) => !excludeIds.has(member.id));
        }

        if (eligibleMembers.length === 0) {
          continue;
        }

        const allowedIds = eligibleMembers.map((member) => member.id);
        const avoidConsecutive = rule.avoidConsecutive !== false;

        const start = new Date(Math.max(rule.startDate.getTime(), from.getTime()));
        const end = new Date(Math.min(rule.endDate.getTime(), to.getTime()));
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);
        if (end < start) continue;

        for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const day = new Date(cursor);
          day.setUTCHours(0, 0, 0, 0);
          const weekday = day.getUTCDay();
          if (rule.byWeekday.length > 0 && !rule.byWeekday.includes(weekday)) continue;

          if (dutyType.kind === 'TIME_RANGE') {
            if (!rule.startTime || !rule.endTime) continue;
            const startsAt = combineDateTime(day, rule.startTime);
            const endsAt = combineDateTime(day, rule.endTime);
            if (!startsAt || !endsAt || endsAt <= startsAt) continue;
            const key = keyOf(day, 0);
            const existing = existingMap.get(key);
            slots.push({
              date: new Date(day),
              slotIndex: 0,
              locked: existing?.locked ?? false,
              assigneeId: existing?.assigneeId ?? undefined,
              startsAt,
              endsAt,
              allowedAssigneeIds: allowedIds,
              avoidConsecutive,
            });
          } else {
            const slotsPerDay = Math.max(1, rule.slotsPerDay);
            for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex += 1) {
              const key = keyOf(day, slotIndex);
              const existing = existingMap.get(key);
              slots.push({
                date: new Date(day),
                slotIndex,
                locked: existing?.locked ?? false,
                assigneeId: existing?.assigneeId ?? undefined,
                startsAt: null,
                endsAt: null,
                allowedAssigneeIds: allowedIds,
                avoidConsecutive,
              });
            }
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

      const assigned = assignMembersToSlots(members, slots, countMap, {
        seed,
        avoidConsecutive: true,
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
          update: {
            assigneeId: slot.assigneeId ?? null,
            startsAt: dutyType.kind === 'TIME_RANGE' ? slot.startsAt ?? null : null,
            endsAt: dutyType.kind === 'TIME_RANGE' ? slot.endsAt ?? null : null,
          },
          create: {
            groupId: group.id,
            typeId: dutyType.id,
            date: slot.date,
            slotIndex: slot.slotIndex,
            assigneeId: slot.assigneeId ?? null,
            startsAt: dutyType.kind === 'TIME_RANGE' ? slot.startsAt ?? null : null,
            endsAt: dutyType.kind === 'TIME_RANGE' ? slot.endsAt ?? null : null,
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
