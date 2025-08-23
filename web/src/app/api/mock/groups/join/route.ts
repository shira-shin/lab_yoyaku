import { NextResponse } from 'next/server';
import { loadDB, saveDB, uid } from '@/lib/mockdb';

export async function POST(req: Request) {
  const { identifier, password } = await req.json().catch(() => ({}));
  if (!identifier)
    return NextResponse.json({ ok: false, error: 'identifier required' }, { status: 400 });
  const key = String(identifier).toLowerCase();
  const db = loadDB();
  const group = db.groups.find(
    g => g.slug.toLowerCase() === key || g.name.toLowerCase() === key
  );
  if (!group)
    return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  if (group.password && group.password !== password)
    return NextResponse.json({ ok: false, error: 'invalid password' }, { status: 401 });
  const member = uid();
  group.members.push(member);
  saveDB(db);
  return NextResponse.json({ ok: true, data: { group, member } });
}
