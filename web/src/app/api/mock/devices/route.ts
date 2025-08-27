import { NextResponse } from 'next/server';
import { loadDB, saveDB, uid } from '@/lib/mockdb';
import { makeSlug } from '@/lib/slug';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 });
  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g.devices ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, name, note, deviceSlug } = body;
  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  const dSlug = deviceSlug || makeSlug(name);
  const d = { id: uid(), slug: dSlug, name, note, qrToken: uid() } as any;
  g.devices = g.devices || [];
  g.devices.push(d);
  saveDB(db);
  return NextResponse.json({ ok: true, data: d });
}

