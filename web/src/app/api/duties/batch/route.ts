export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageDuties, getActorByEmail } from '@/lib/perm';
import * as Z from 'zod';

const Body = Z.object({
  groupSlug: Z.string(),
  dutyTypeId: Z.string(),
  from: Z.string(), // yyyy-mm-dd
  to: Z.string(),
  mode: Z.enum(['ROUND_ROBIN', 'RANDOM', 'MANUAL']),
  memberIds: Z.unknown().optional(),
  weekdays: Z.unknown().optional(),
});

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    const formData = await req.formData();
    const acc: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      if (key in acc) {
        acc[key] = Array.isArray(acc[key]) ? [...acc[key], value] : [acc[key], value];
      } else {
        acc[key] = value;
      }
    }
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const me = await getActorByEmail(email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await readBody(req);
    const body = Body.parse(raw);
    const toStrArray = (v: unknown): string[] => {
      if (v == null) return [];
      if (Array.isArray(v)) return v.map((item) => String(item));
      return [String(v)];
    };

    const memberIds: string[] = toStrArray(body.memberIds);

    const weekdaysRaw: string[] = toStrArray(body.weekdays);
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
    const normalizedEmail = email?.toLowerCase() ?? '';
    const role = membership?.role ?? (group.hostEmail?.toLowerCase() === normalizedEmail ? 'OWNER' : null);
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
    if (error instanceof Z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'batch create duties failed' }, { status: 500 });
  }
}
