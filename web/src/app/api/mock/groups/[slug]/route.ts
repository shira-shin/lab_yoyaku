import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';

export async function GET(_req: Request, { params: { slug } }: { params: { slug: string } }) {
  const db = loadDB();
  const g = db.groups.find(x => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g });
}

export async function POST(
  req: Request,
  { params: { slug } }: { params: { slug: string } }
) {
  const db = loadDB();
  const g = db.groups.find(x => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === 'join' && body?.member) {
    const m = String(body.member);
    if (!g.members.includes(m)) g.members.push(m);
  }
  saveDB(db);
  return NextResponse.json({ ok: true, data: g });
}
