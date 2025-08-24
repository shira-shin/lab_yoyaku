import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { uuid } from '@/lib/uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const me = searchParams.get('me');
  if (me) {
    const from = searchParams.get('from');
    const limit = Number(searchParams.get('limit') || '5');
    const fromDate = from ? new Date(from) : new Date();
    const result: any[] = [];
    for (const g of db.groups) {
      for (const r of g.reservations) {
        if (new Date(r.end) < fromDate) continue;
        const d = g.devices.find((d) => d.id === r.deviceId);
        result.push({
          deviceName: d?.name || '',
          deviceSlug: d?.slug || '',
          from: r.start,
          to: r.end,
          purpose: r.title || '',
        });
      }
    }
    result.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
    return NextResponse.json({ ok: true, data: result.slice(0, limit) });
  }

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
