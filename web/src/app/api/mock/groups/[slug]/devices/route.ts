export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { store } from '../../../_store';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const g = store.findGroupBySlug(params.slug?.toLowerCase());
  if (!g) return NextResponse.json({ error: 'group not found' }, { status: 404 });
  const devices = store.listDevices(params.slug).map((d: any) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
  }));
  return NextResponse.json({ devices }, { status: 200 });
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json();
  const name = String(body.name || '').trim();
  const slug = String(body.slug || '').trim();
  const caution = String(body.caution || '');
  const code = String(body.code || '');
  if (!name || !slug)
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  const device = store.addDevice(params.slug, { name, slug, caution, code });
  if (!device)
    return NextResponse.json({ error: 'group not found or exists' }, { status: 404 });
  return NextResponse.json({ device }, { status: 201 });
}
