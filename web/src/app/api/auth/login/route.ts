import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { identifier, username, password } = body;
  const ident = identifier ?? username;
  const g = db.groups.find(
    (x) => x.slug === ident || x.name === ident
  );
  if (!g)
    return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  if (g.passwordHash && g.passwordHash !== password)
    return NextResponse.json({ ok: false, error: 'invalid password' }, { status: 403 });

  await createSession({ groupId: g.id, groupSlug: g.slug, groupName: g.name });
  return NextResponse.json({ ok: true, data: { slug: g.slug, name: g.name } });
}
