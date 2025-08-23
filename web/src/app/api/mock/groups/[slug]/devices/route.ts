import { NextResponse } from 'next/server';
import { loadDB, saveDB, uid } from '@/lib/mockdb';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const g = db.groups.find(x => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g.devices });
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const { name, note } = body ?? {};
  if (!name) return NextResponse.json({ ok: false, error: 'name required' }, { status: 400 });

  const db = loadDB();
  const g = db.groups.find(x => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

  const d = { id: uid(), name: String(name).trim(), note: note?.trim?.() } ;
  g.devices.push(d);
  saveDB(db);
  return NextResponse.json({ ok: true, data: d });
}
