export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth, normalizeEmail } from '@/lib/auth-legacy';
import { prisma } from '@/server/db/prisma';
import { canManageDuties, getActorByEmail } from '@/lib/perm';
import { z } from '@/lib/zod-shim';

const Body = z.object({
  groupSlug: z.string(),
  dutyTypeId: z.string(),
  from: z.string(), // yyyy-mm-dd
  to: z.string(),
  mode: z.enum(['ROUND_ROBIN', 'RANDOM', 'MANUAL']),
  memberIds: z.unknown().optional(),
  weekdays: z.unknown().optional(),
});

const OneOffBody = z.object({
  groupSlug: z.string().min(1),
  dutyTypeId: z.string().min(1),
  dates: z.array(z.string().min(1)).min(1),
  slots: z.coerce.number().int().min(1).default(1),
  assigneeIds: z.array(z.string().min(1)).optional(),
});

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    const formData = await req.formData();
    const acc: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (key in acc) {
        acc[key] = Array.isArray(acc[key]) ? [...acc[key], value] : [acc[key], value];
      } else {
        acc[key] = value;
      }
    });
    return acc;
  }
}

function buildDateList(from: Date, to: Date) {
  const list: Date[] = [];
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    list.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return list;
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function parseDutyDate(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    if ([year, month, day].some((n) => !Number.isFinite(n))) return null;
    const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
}

async function handleOneOffCreation(
  input: z.infer<typeof OneOffBody>,
  context: { me: NonNullable<Awaited<ReturnType<typeof getActorByEmail>>>; email: string | null }
) {
  const { me, email } = context;
  const slug = input.groupSlug.toLowerCase();

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true, hostEmail: true, dutyManagePolicy: true },
  });
  if (!group) {
    return NextResponse.json({ error: 'group not found' }, { status: 404 });
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId: group.id, userId: me.id },
    select: { role: true },
  });
  const normalizedEmail = email ? normalizeEmail(email) : '';
  const role =
    membership?.role ??
    (normalizeEmail(group.hostEmail ?? '') === normalizedEmail ? 'OWNER' : null);
  if (!canManageDuties(group.dutyManagePolicy, role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const type = await prisma.dutyType.findFirst({
    where: { id: input.dutyTypeId, groupId: group.id },
    select: { id: true },
  });
  if (!type) {
    return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
  }

  const parsedDates = input.dates
    .map((value) => parseDutyDate(value))
    .filter((value): value is Date => Boolean(value));
  const uniqueDates = Array.from(
    new Map(parsedDates.map((date) => [date.toISOString(), date] as const)).values()
  );

  if (uniqueDates.length === 0) {
    return NextResponse.json({ error: 'invalid dates' }, { status: 400 });
  }

  const candidateAssignees = Array.from(
    new Set((input.assigneeIds ?? []).map((value) => value.trim()).filter(Boolean))
  );

  let allowedAssigneeIds: string[] = [];
  if (candidateAssignees.length > 0) {
    const validMembers = await prisma.groupMember.findMany({
      where: { groupId: group.id, userId: { in: candidateAssignees } },
      select: { userId: true },
    });
    allowedAssigneeIds = Array.from(
      new Set(
        validMembers
          .map((member) => member.userId)
          .filter((value): value is string => Boolean(value))
      )
    );
    if (allowedAssigneeIds.length === 0) {
      return NextResponse.json({ error: 'members required' }, { status: 400 });
    }
  }

  const existingAssignments = await prisma.dutyAssignment.findMany({
    where: { groupId: group.id, typeId: type.id, date: { in: uniqueDates } },
    select: { date: true, slotIndex: true },
  });

  const usedSlotMap = new Map<string, Set<number>>();
  for (const assignment of existingAssignments) {
    const key = assignment.date.toISOString();
    if (!usedSlotMap.has(key)) {
      usedSlotMap.set(key, new Set());
    }
    usedSlotMap.get(key)!.add(assignment.slotIndex);
  }

  const records: { groupId: string; typeId: string; date: Date; slotIndex: number; assigneeId: string | null }[] = [];
  let assignCursor = 0;
  for (const date of uniqueDates) {
    const key = date.toISOString();
    const slotSet = usedSlotMap.get(key) ?? new Set<number>();
    for (let index = 0; index < input.slots; index += 1) {
      let slotIndex = 0;
      while (slotSet.has(slotIndex)) {
        slotIndex += 1;
      }
      slotSet.add(slotIndex);
      const assigneeId =
        allowedAssigneeIds.length > 0
          ? allowedAssigneeIds[assignCursor % allowedAssigneeIds.length]
          : null;
      records.push({
        groupId: group.id,
        typeId: type.id,
        date: new Date(date.getTime()),
        slotIndex,
        assigneeId,
      });
      if (allowedAssigneeIds.length > 0) {
        assignCursor += 1;
      }
    }
    usedSlotMap.set(key, slotSet);
  }

  if (records.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const result = await prisma.dutyAssignment.createMany({
    data: records,
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, count: result.count });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const me = await getActorByEmail(email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await readBody(req);
    const normalized = raw ?? {};
    const dateCandidates = toStringArray((normalized as any).dates ?? (normalized as any).date);
    const hasOneOffMarkers =
      dateCandidates.length > 0 ||
      'slots' in normalized ||
      'slotCount' in normalized ||
      'slotsPerDay' in normalized ||
      'assigneeId' in normalized ||
      'assigneeIds' in normalized;

    if (hasOneOffMarkers) {
      const groupSlugSource =
        (normalized as any).groupSlug ?? (normalized as any).group ?? (normalized as any).slug ?? '';
      const dutyTypeSource =
        (normalized as any).dutyTypeId ??
        (normalized as any).typeId ??
        (normalized as any).type ??
        (normalized as any).dutyType ??
        '';
      const slotsSource =
        (normalized as any).slots ??
        (normalized as any).slotCount ??
        (normalized as any).slotsPerDay ??
        undefined;
      const slotsValue =
        slotsSource === undefined || slotsSource === null || String(slotsSource).trim() === ''
          ? undefined
          : slotsSource;
      const parsedOneOff = OneOffBody.safeParse({
        groupSlug: String(groupSlugSource ?? '').trim(),
        dutyTypeId: String(dutyTypeSource ?? '').trim(),
        dates: dateCandidates.filter((value) => value && value.trim()).map((value) => value.trim()),
        slots: slotsValue,
        assigneeIds: toStringArray(
          (normalized as any).assigneeIds ??
            (normalized as any).assigneeId ??
            (normalized as any).memberIds ??
            (normalized as any).memberId ??
            [],
        )
          .map((value) => value.trim())
          .filter(Boolean),
      });
      if (!parsedOneOff.success) {
        return NextResponse.json(
          { error: 'invalid body', details: parsedOneOff.error.flatten() },
          { status: 400 }
        );
      }
      return handleOneOffCreation(parsedOneOff.data, { me, email });
    }

    const body = Body.parse(normalized);

    const memberIds: string[] = toStringArray(body.memberIds);

    const weekdaysRaw: string[] = toStringArray(body.weekdays);
    const weekdayNums: number[] = weekdaysRaw
      .map((value) => Number(value))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);

    const slug = body.groupSlug.toLowerCase();
    const group = await prisma.group.findUnique({
      where: { slug },
      select: { id: true, hostEmail: true, dutyManagePolicy: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: me.id },
      select: { role: true },
    });
    const normalizedEmail = email ? normalizeEmail(email) : '';
    const role =
      membership?.role ??
      (normalizeEmail(group.hostEmail ?? '') === normalizedEmail ? 'OWNER' : null);
    if (!canManageDuties(group.dutyManagePolicy, role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const type = await prisma.dutyType.findFirst({
      where: { id: body.dutyTypeId, groupId: group.id },
      select: { id: true },
    });
    if (!type) {
      return NextResponse.json({ error: 'duty type not found' }, { status: 404 });
    }

    const fromDate = new Date(`${body.from}T00:00:00Z`);
    const toDate = new Date(`${body.to}T00:00:00Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 });
    }
    if (fromDate.getTime() > toDate.getTime()) {
      return NextResponse.json({ error: 'invalid range' }, { status: 400 });
    }

    const weekdaySet = new Set(
      weekdayNums
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    );

    const allDates = buildDateList(fromDate, toDate);
    const targetDates = allDates.filter((date) =>
      weekdaySet.size > 0 ? weekdaySet.has(date.getUTCDay()) : true
    );

    if (targetDates.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    if (body.mode === 'MANUAL') {
      const result = await prisma.dutyAssignment.createMany({
        data: targetDates.map((date) => ({
          groupId: group.id,
          typeId: type.id,
          date,
          slotIndex: 0,
          assigneeId: null,
        })),
        skipDuplicates: true,
      });
      return NextResponse.json({ ok: true, count: result.count });
    }

    const filteredMemberIds = memberIds.filter((value) => Boolean(value));
    if (filteredMemberIds.length === 0) {
      return NextResponse.json({ error: 'members required' }, { status: 400 });
    }

    const validMembers = await prisma.groupMember.findMany({
      where: { groupId: group.id, userId: { in: filteredMemberIds } },
      select: { userId: true },
    });
    const allowedIds = validMembers.map((member) => member.userId).filter((value): value is string => Boolean(value));
    const uniqueAllowedIds = Array.from(new Set(allowedIds));

    if (uniqueAllowedIds.length === 0) {
      return NextResponse.json({ error: 'members required' }, { status: 400 });
    }

    const picks: { date: Date; assigneeId: string }[] = [];
    if (body.mode === 'ROUND_ROBIN') {
      let index = 0;
      for (const date of targetDates) {
        const assigneeId = uniqueAllowedIds[index % uniqueAllowedIds.length];
        picks.push({ date, assigneeId });
        index += 1;
      }
    } else {
      for (const date of targetDates) {
        const randomIndex = Math.floor(Math.random() * uniqueAllowedIds.length);
        picks.push({ date, assigneeId: uniqueAllowedIds[randomIndex] });
      }
    }

    const result = await prisma.dutyAssignment.createMany({
      data: picks.map((item) => ({
        groupId: group.id,
        typeId: type.id,
        date: item.date,
        slotIndex: 0,
        assigneeId: item.assigneeId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error('batch create duties failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'batch create duties failed' }, { status: 500 });
  }
}
