export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupSlug = searchParams.get('groupSlug');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const includeType = searchParams.get('include') === 'type';

    if (!groupSlug || !from || !to) {
      return NextResponse.json({ data: [] });
    }

    const group = await prisma.group.findUnique({
      where: { slug: groupSlug.toLowerCase() },
      select: { id: true },
    });
    if (!group) {
      return NextResponse.json({ data: [] });
    }

    const assignments = await prisma.dutyAssignment.findMany({
      where: { groupId: group.id, date: { gte: new Date(from), lte: new Date(to) } },
      orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
      include: {
        ...(includeType
          ? {
              type: { select: { name: true, color: true, kind: true } },
            }
          : {}),
        assignee: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ data: assignments });
  } catch (error) {
    console.error('list duties failed', error);
    return NextResponse.json({ error: 'list duties failed' }, { status: 500 });
  }
}
