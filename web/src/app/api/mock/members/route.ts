import { NextResponse } from 'next/server';
import { findMembers } from '@/lib/mock-db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  if (!groupId)
    return NextResponse.json({ ok: false, error: 'groupId required' }, { status: 400 });
  return NextResponse.json({ ok: true, data: findMembers(groupId) });
}

