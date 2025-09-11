import { NextResponse } from 'next/server';
import { store } from '../../../_store';

export async function POST(req: Request, { params }: { params: { group: string } }) {
  const body = await req.json();
  const name = String(body.name || '').trim();
  const slug = String(body.slug || '').trim();
  const caution = String(body.caution || '');
  const code = String(body.code || '');
  if (!name || !slug)
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  const device = store.addDevice(params.group, { name, slug, caution, code });
  if (!device)
    return NextResponse.json({ error: 'group not found or exists' }, { status: 404 });
  return NextResponse.json({ device }, { status: 201 });
}
