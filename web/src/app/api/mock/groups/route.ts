import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { makeSlug } from '@/lib/slug';

export async function GET() {
  const db = loadDB();
  return NextResponse.json({ ok: true, data: db.groups });
}

export async function POST(req: Request) {
  const { name, password, slug } = await req.json();
  if (!name) {
    return NextResponse.json({ ok: false, error: 'invalid request' }, { status: 400 });
  }
  const db = loadDB();
  const s = makeSlug(slug || name);
  if (db.groups.find((g: any) => g.slug === s)) {
    return NextResponse.json({ ok: false, error: 'slug already exists' }, { status: 409 });
  }
  const g = {
    slug: s,
    name,
    password: password || undefined,
    members: [],
    devices: [],
    reservations: [],
  } as any;
  db.groups.push(g);
  saveDB(db);
  return NextResponse.json({ ok: true, data: { slug: g.slug, name: g.name } });
}

