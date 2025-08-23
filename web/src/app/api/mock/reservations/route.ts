import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { uuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 });
  const deviceId = searchParams.get('deviceId');
  const g = db.groups.find((x) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  const list = deviceId
    ? g.reservations.filter((r) => r.deviceId === deviceId)
    : g.reservations;
  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, deviceId, start, end, reserver, title, scope, memberId } = body;
  const g = db.groups.find((x) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  if (!g.devices.find((d) => d.id === deviceId)) {
    return NextResponse.json({ ok: false, error: 'unknown device' }, { status: 400 });
  }
  const r = { id: uuid(), deviceId, start, end, reserver, title, scope: scope ?? 'group', memberId };
  g.reservations.push(r);
  return NextResponse.json({ ok: true, data: r });
}
