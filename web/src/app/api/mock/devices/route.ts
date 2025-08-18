import { NextResponse } from 'next/server';
import { findDevices, insertDevice } from '@/lib/mock-db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  if (!groupId)
    return NextResponse.json({ ok: false, error: 'groupId required' }, { status: 400 });
  return NextResponse.json({ ok: true, data: findDevices(groupId) });
}

export async function POST(req: Request) {
  const p = await req.json();
  const { groupId, name, uid } = p;
  if (!groupId || !name || !uid)
    return NextResponse.json(
      { ok: false, error: 'groupId, name, uid required' },
      { status: 400 }
    );
  const device = insertDevice({
    groupId,
    name,
    uid,
    category: p.category,
    location: p.location,
    status: p.status,
    sopVersion: p.sopVersion,
  });
  return NextResponse.json({ ok: true, data: device }, { status: 201 });
}

