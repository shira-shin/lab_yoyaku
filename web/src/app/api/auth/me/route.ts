import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';

export async function GET() {
  const me = await readUserFromCookie();
  return NextResponse.json({ ok: !!me, user: me });
}

