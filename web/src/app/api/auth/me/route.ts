export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth-legacy';

export const runtime = 'nodejs';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, user: me, profile: { displayName: me.name ?? null } });
}

