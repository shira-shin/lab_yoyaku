export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { store, toArr } from '../../../../_store';

export async function GET(_req: Request, { params }: { params: { slug: string; device: string } }) {
  const dev = store.findDevice(params.slug, params.device);
  if (!dev) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const reservations = toArr(store.findReservationsByDevice(dev.id));
  return NextResponse.json({ device: dev, group: { slug: params.slug }, reservations });
}
