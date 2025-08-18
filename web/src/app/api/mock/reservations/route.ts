import { NextResponse } from 'next/server';
import { findReservations, insertReservation } from '@/lib/mock-db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  if (!groupId)
    return NextResponse.json({ ok: false, error: 'groupId required' }, { status: 400 });
  const deviceId = searchParams.get('deviceId') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const data = findReservations({ groupId, deviceId, from, to });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const p = await req.json();
  if (!p.groupId || !p.deviceId || !p.title || !p.start || !p.end || !p.reservedBy)
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  const res = insertReservation(p);
  return NextResponse.json({ ok: true, data: res }, { status: 201 });
}

