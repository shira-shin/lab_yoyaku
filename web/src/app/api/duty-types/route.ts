export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth, normalizeEmail } from '@/lib/auth-legacy';
import { prisma } from '@/lib/prisma';
import { canManageDuties, getActorByEmail } from '@/lib/perm';
import { z } from '@/lib/zod-shim';

const Body = z.object({
  groupSlug: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupSlug = searchParams.get('groupSlug');
    if (!groupSlug) {
      return NextResponse.json([]);
    }

    const slug = groupSlug.toLowerCase();
    const session = await auth();
    const email = session?.user?.email ?? null;
    const me = await getActorByEmail(email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { slug },
      select: {
        id: true,
        hostEmail: true,
        dutyTypes: { select: { id: true, name: true, color: true, visibility: true, kind: true } },
        members: { select: { userId: true, email: true } },
      },
    });

    if (!group) {
      return NextResponse.json([]);
    }

    const normalizedEmail = email ? normalizeEmail(email) : '';
    const isMember =
      normalizeEmail(group.hostEmail ?? '') === normalizedEmail ||
      group.members.some(
        (member) => member.userId === me.id || normalizeEmail(member.email) === normalizedEmail,
      );

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json(group.dutyTypes);
  } catch (error) {
    console.error('list duty types failed', error);
    return NextResponse.json({ error: 'list duty types failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const me = await getActorByEmail(email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await req
      .json()
      .catch(async () => Object.fromEntries((await req.formData()).entries()));
    const body = Body.parse(raw);
    const slug = body.groupSlug.toLowerCase();
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

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

    const created = await prisma.dutyType.create({
      data: {
        name,
        color: body.color?.trim() ? body.color.trim() : undefined,
        group: { connect: { id: group.id } },
      },
      select: { id: true, name: true, color: true, visibility: true, kind: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('create duty type failed', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid body', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'create duty type failed' }, { status: 500 });
  }
}
