export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { readUserFromCookie } from '@/lib/auth';
import { isGroupAdmin } from '@/lib/duties/permissions';

type DutyVisibility = 'PUBLIC' | 'MEMBERS_ONLY';

function normalizeSlug(value: string | string[] | undefined) {
  if (!value) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').trim().toLowerCase();
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
    const name = String((body as any)?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const colorRaw = (body as any)?.color;
    const visibilityRaw = (body as any)?.visibility;
    const color = colorRaw ? String(colorRaw).trim() : '#7c3aed';
    const visibility: DutyVisibility =
      visibilityRaw === 'MEMBERS_ONLY' ? 'MEMBERS_ONLY' : 'PUBLIC';

    const duplicate = await prisma.dutyType.findFirst({
      where: { groupId: group.id, name },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'duty type already exists' }, { status: 409 });
    }

    const created = await prisma.dutyType.create({
      data: {
        groupId: group.id,
        name,
        color,
        visibility,
      },
      select: {
        id: true,
        groupId: true,
        name: true,
        color: true,
        visibility: true,
      },
    });

    return NextResponse.json({ dutyType: created }, { status: 201 });
  } catch (error) {
    console.error('create duty type failed', error);
    return NextResponse.json({ error: 'create duty type failed' }, { status: 500 });
  }
}
