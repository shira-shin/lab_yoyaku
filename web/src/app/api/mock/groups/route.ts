import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { makeSlug } from '@/lib/slug';
import { readUserFromCookie } from '@/lib/auth';

export async function GET() {
  const db = loadDB();
  return NextResponse.json({ ok: true, data: db.groups });
}

export async function POST(req: Request) {
  const { name, password, slug, reserveFrom, reserveTo, memo } = await req.json();
  if (!name) {
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
  const db = loadDB();
  const s = makeSlug(slug || name);
  if (db.groups.find((g: any) => g.slug === s)) {
    return NextResponse.json({ ok: false, error: 'slug already exists' }, { status: 409 });
  }

  const me = await readUserFromCookie().catch(() => null);

  const g = {
    slug: s,
    name,
    password: password || undefined,
    members: [],
    devices: [],
    reservations: [],
    reserveFrom: reserveFrom || undefined,
    reserveTo: reserveTo || undefined,
    memo: memo || undefined,
    host: me?.email,
  } as any;
  db.groups.push(g);
  saveDB(db);
  return NextResponse.json({ ok: true, data: { slug: g.slug, name: g.name } });
}

