import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = loadDB();
  const u = (db.users || []).find((x: any) => x.email === me.email);
  return NextResponse.json({ displayName: u?.name ?? null });
}

export async function PUT(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const displayName = String(body.displayName || '').trim();
  const db = loadDB();
  const u = (db.users || []).find((x: any) => x.email === me.email);
  if (u) {
    u.name = displayName;
    saveDB(db);
  }
  return NextResponse.json({ ok: true, displayName });
}
