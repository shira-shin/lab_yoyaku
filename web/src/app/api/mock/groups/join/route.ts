import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';

export async function POST(req: Request) {
  const body = await req.json();
  const { identifier, password } = body;
  const g = db.groups.find(
    (x) => x.slug === identifier || x.name === identifier
  );
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  if (g.passwordHash && g.passwordHash !== password) {
    return NextResponse.json({ ok: false, error: 'invalid password' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, data: g });
}
