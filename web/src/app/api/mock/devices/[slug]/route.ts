export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { store } from '../../_store';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const d = store.findDeviceBySlug(params.slug);
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ device: d });
}
