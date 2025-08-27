import { NextResponse } from 'next/server';
import { loadDB } from '@/lib/mockdb';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g });
}

