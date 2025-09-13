import { NextResponse } from 'next/server';
import { store } from '../../../_store';

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const groupSlug = params.slug?.toLowerCase();
  const deviceSlug = String(body.device || '').toLowerCase();
  const start = String(body.start || '');
  const end = String(body.end || '');
  const purpose = String(body.purpose || '');

  const group = store.findGroupBySlug(groupSlug);
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });

  const device = store.findDevice(groupSlug, deviceSlug);
  if (!device) return NextResponse.json({ error: 'device not found' }, { status: 404 });

  const reservation = store.createReservation({
    groupSlug,
    deviceId: device.id,
    start,
    end,
    purpose,
    userId: store.currentUserId(),
  });

  return NextResponse.json({ ok: true, reservation }, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const group = store.findGroupBySlug(params.slug?.toLowerCase());
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 });
  const list = store.listReservationsByGroup(params.slug);
  return NextResponse.json({ reservations: list }, { status: 200 });
}
