import { NextResponse } from 'next/server';
import { mockDB, verifyPassword, insertMember } from '@/lib/mock-db';

const publicGroup = (g: any) => {
  const { passwordHash, ...rest } = g;
  return rest;
};

export async function POST(req: Request) {
  const { identifier, password } = await req.json();
  if (!identifier || !password)
    return NextResponse.json({ ok: false, error: 'identifier and password required' }, { status: 400 });
  const key = identifier.toLowerCase();
  const group = mockDB.groups.find(
    g => g.slug.toLowerCase() === key || g.name.toLowerCase() === key
  );
  if (!group)
    return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  const ok = await verifyPassword(group, password);
  if (!ok)
    return NextResponse.json({ ok: false, error: 'invalid password' }, { status: 401 });
  const member = insertMember({ groupId: group.id, displayName: 'member', role: 'member' });
  return NextResponse.json({ ok: true, data: { group: publicGroup(group), member } });
}

