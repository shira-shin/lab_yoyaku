import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';

const publicGroup = (g: any) => {
  const { password, ...rest } = g;
  return rest;
};

export async function GET() {
  const db = loadDB();
  return NextResponse.json({ ok: true, data: db.groups.map(publicGroup) });
}

export async function POST(req: Request) {
  const { name, slug, password } = await req.json().catch(() => ({}));
  if (!name || !slug) {
    return NextResponse.json(
      { ok: false, error: 'name and slug are required' },
      { status: 400 }
    );
  }
  const db = loadDB();
  if (db.groups.some(g => g.slug === slug)) {
    return NextResponse.json({ ok: false, error: 'slug exists' }, { status: 400 });
  }
  const group = {
    slug: String(slug).trim(),
    name: String(name).trim(),
    password: password ? String(password) : undefined,
    members: [],
    devices: [],
    reservations: [],
  };
  db.groups.push(group);
  saveDB(db);
  return NextResponse.json({ ok: true, data: publicGroup(group) }, { status: 201 });
}
