export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { auth, normalizeEmail } from '@/lib/auth-legacy';
import { prisma } from '@/server/db/prisma';
import { getActorByEmail } from '@/lib/perm';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const me = await getActorByEmail(email ?? undefined);
    if (!me) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const slug = params.slug.toLowerCase();
    const group = await prisma.group.findUnique({
      where: { slug },
      select: {
        id: true,
        hostEmail: true,
        members: {
          select: {
            userId: true,
            email: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    const normalizedEmail = email ? normalizeEmail(email) : '';
    const isMember =
      normalizeEmail(group.hostEmail ?? '') === normalizedEmail ||
      group.members.some(
        (member) => member.userId === me.id || normalizeEmail(member.email) === normalizedEmail
      );

    if (!isMember) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const items: { id: string; email: string; displayName: string }[] = [];
    const append = (id: string | null | undefined, emailValue: string | null | undefined, name?: string | null) => {
      if (!id || !emailValue) return;
      const displayName = name?.trim() || emailValue.split('@')[0] || emailValue;
      if (!items.some((item) => item.id === id)) {
        items.push({ id, email: emailValue, displayName });
      }
    };

    group.members.forEach((member) => {
      const userId = member.userId ?? member.user?.id ?? null;
      const userEmail = member.user?.email ?? member.email;
      append(userId, userEmail, member.user?.name ?? null);
    });

    if (group.hostEmail) {
      const hostEmail = normalizeEmail(group.hostEmail);
      const existing = items.some((item) => normalizeEmail(item.email) === hostEmail);
      if (!existing) {
        const host = await prisma.user.findUnique({
          where: { normalizedEmail: hostEmail },
          select: { id: true, name: true, email: true },
        });
        if (host) {
          append(host.id, host.email, host.name);
        }
      }
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('list group members failed', error);
    return NextResponse.json({ error: 'list group members failed' }, { status: 500 });
  }
}
