import { NextResponse } from 'next/server';
import { loadDB, saveDB, uid, overlap } from '@/lib/mockdb';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const g = db.groups.find(x => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g.reservations });
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const { deviceId, user, start, end, purpose } = await req.json().catch(() => ({}));
  if (!deviceId || !user || !start || !end) {
    return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 });
  }
  const s = new Date(start), e = new Date(end);
  if (!(s < e)) return NextResponse.json({ ok: false, error: 'invalid range' }, { status: 400 });

  const db = loadDB();
  const g = db.groups.find(x => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  if (!g.members.includes(user)) {
    return NextResponse.json({ ok: false, error: 'user not in group' }, { status: 403 });
  }
  if (!g.devices.find(d => d.id === deviceId)) {
    return NextResponse.json({ ok: false, error: 'device not found' }, { status: 404 });
  }

  // 同一デバイスの重複チェック
  const hasConflict = g.reservations.some(r =>
    r.deviceId === deviceId && overlap(start, end, r.start, r.end)
  );
  if (hasConflict) {
    return NextResponse.json({ ok: false, error: 'conflict' }, { status: 409 });
  }

  const r = { id: uid(), deviceId, user, start, end, purpose };
  g.reservations.push(r);
  saveDB(db);
  return NextResponse.json({ ok: true, data: r });
}
