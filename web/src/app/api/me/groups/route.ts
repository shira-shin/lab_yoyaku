import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const db = loadDB();
  const groups = (db.groups ?? [])
    .filter((g: any) => Array.isArray(g.members) && g.members.includes(me.email))
    .map((g: any) => ({ slug: g.slug, name: g.name }));

  return NextResponse.json({ ok: true, data: groups });
}
