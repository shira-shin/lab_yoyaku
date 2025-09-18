export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { store } from '../../../_store';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const groupSlug = params.slug?.toLowerCase();
  const deviceSlug = String(body.device || '').toLowerCase();
  const start = String(body.start || '');
  const end = String(body.end || '');
  const purpose = String(body.purpose || '');

  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const group = store.findGroupBySlug(groupSlug);
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

  const device = store.findDevice(groupSlug, deviceSlug);
  if (!device) return NextResponse.json({ error: 'device not found' }, { status: 404 });

  if (!start || !end || new Date(start) >= new Date(end)) {
    return NextResponse.json({ error: 'invalid time range' }, { status: 400 });
  }

  const reservation = store.createReservation({
    groupSlug,
    deviceId: device.id,
    start,
    end,
    purpose,
    user: me.email,
    userName: me.name || me.email,
  });

  return NextResponse.json({ ok: true, reservation }, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const group = store.findGroupBySlug(params.slug?.toLowerCase());
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });
  const list = store.listReservationsByGroup(params.slug);
  const db = loadDB();
  const mapped = list.map((r: any) => {
    const u = (db.users || []).find((x: any) => x.email === r.user);
    return { ...r, userName: u?.name || r.userName || r.user };
  });
  return NextResponse.json({ reservations: mapped }, { status: 200 });
}
