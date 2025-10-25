export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-legacy';
import { prisma } from '@/server/db/prisma';
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

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function toNumberArray(value: unknown): number[] {
  return toStringArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (!text) return undefined;
  if (['true', '1', 'on', 'yes'].includes(text)) return true;
  if (['false', '0', 'off', 'no'].includes(text)) return false;
  return undefined;
}

function sanitizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const me = await getActorByEmail(session?.user?.email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await readBody(req);
    const normalized = {
      typeId:
        (raw as any)?.typeId ??
        (raw as any)?.dutyTypeId ??
        (raw as any)?.type ??
        '',
      startDate:
        (raw as any)?.startDate ??
        (raw as any)?.start ??
        (raw as any)?.from ??
        '',
      endDate:
        (raw as any)?.endDate ??
        (raw as any)?.end ??
        (raw as any)?.to ??
        '',
      byWeekday: toNumberArray((raw as any)?.byWeekday ?? (raw as any)?.weekdays),
      slotsPerDay: parseOptionalNumber((raw as any)?.slotsPerDay ?? (raw as any)?.slots ?? (raw as any)?.slotCount),
      startTime: sanitizeOptionalString((raw as any)?.startTime ?? (raw as any)?.fromTime),
      endTime: sanitizeOptionalString((raw as any)?.endTime ?? (raw as any)?.toTime),
      includeMemberIds: toStringArray(
        (raw as any)?.includeMemberIds ??
          (raw as any)?.includeMembers ??
          (raw as any)?.memberIds ??
          []
      ).filter((value) => value.trim()),
      excludeMemberIds: toStringArray(
        (raw as any)?.excludeMemberIds ??
          (raw as any)?.excludeMembers ??
          []
      ).filter((value) => value.trim()),
      avoidConsecutive: parseOptionalBoolean((raw as any)?.avoidConsecutive),
    };

    const input = Body.parse(normalized);
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

    const data = {
      type: { connect: { id: input.typeId } },
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      byWeekday: input.byWeekday ?? [],
      slotsPerDay: input.slotsPerDay ?? 1,
      includeMemberIds: input.includeMemberIds ?? [],
      excludeMemberIds: input.excludeMemberIds ?? [],
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.avoidConsecutive !== undefined
        ? { avoidConsecutive: input.avoidConsecutive }
        : {}),
    };

    const created = await prisma.dutyRule.create({ data });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('create duty rule failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'create duty rule failed' }, { status: 500 });
  }
}
