import { NextResponse } from 'next/server';
import { db } from '@/lib/mock-db';
import { uuid } from '@/lib/uuid';
import { makeSlug } from '@/lib/slug';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 });
  const g = db.groups.find((x) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g.devices });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, name, note, deviceSlug } = body;
  const g = db.groups.find((x) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  const dSlug = deviceSlug || makeSlug(name);
  const d = { id: uuid(), slug: dSlug, name, note, qrToken: uuid().replace(/-/g, '') };
  g.devices.push(d);
  return NextResponse.json({ ok: true, data: d });
}
