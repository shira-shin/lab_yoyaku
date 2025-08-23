import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const g = db.groups.find((x) => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g });
}
