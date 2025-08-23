import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { uuid } from '@/lib/uuid';

export async function GET() {
  return NextResponse.json({ ok: true, data: db.groups });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, slug, password } = body;
  if (!name || !slug) {
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
  if (db.groups.find((g) => g.slug === slug)) {
    return NextResponse.json({ ok: false, error: 'slug already exists' }, { status: 409 });
  }
  const g = {
    id: uuid(),
    name,
    slug,
    passwordHash: password || undefined,
    members: [],
    devices: [],
    reservations: [],
  };
  db.groups.push(g);
  return NextResponse.json({ ok: true, data: g });
}
