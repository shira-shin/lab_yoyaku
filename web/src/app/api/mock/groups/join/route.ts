import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { readUserFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const { query, password } = await req.json();
  const norm = (s: string) => String(s || '').trim().toLowerCase();

  const db = loadDB();
  const g = db.groups.find(
    (x: any) => norm(x.slug) === norm(query) || norm(x.name) === norm(query)
  );
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  if (g.password && g.password !== password) {
    return NextResponse.json({ ok: false, error: 'wrong password' }, { status: 403 });
  }

  g.members ||= [];
  if (!g.members.includes(me.email)) g.members.push(me.email);
  saveDB(db);

  return NextResponse.json({ ok: true, data: { slug: g.slug, name: g.name } });
}

