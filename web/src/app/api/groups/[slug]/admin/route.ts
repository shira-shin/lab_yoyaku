export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { getServerSession } from '@/lib/auth';

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sanitizeBaseUrl(value: string | undefined | null) {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  const slug = decodeSlug(params.slug ?? '').toLowerCase();
  const group = await prisma.group.findUnique({ where: { slug } });
  if (!group) {
    return NextResponse.json({ code: 'group_not_found' }, { status: 404 });
  }

  if (group.hostEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ code: 'forbidden' }, { status: 403 });
  }

  const memberCount = await prisma.groupMember.count({ where: { groupId: group.id } });
  const baseUrl = sanitizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  const inviteLink = `${baseUrl}/groups/${encodeURIComponent(group.slug)}/join`;

  return NextResponse.json(
    {
      name: group.name ?? group.slug,
      slug: group.slug,
      hasPassword: Boolean(group.passcode),
      memberCount,
      inviteLink,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
