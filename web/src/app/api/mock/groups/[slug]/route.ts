import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { readUserFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: g });
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { reserveFrom, reserveTo, memo, host } = await req.json();
  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === params.slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  const me = await readUserFromCookie().catch(() => null);
  if (g.host && me?.email !== g.host) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  if (reserveFrom !== undefined) g.reserveFrom = reserveFrom || undefined;
  if (reserveTo !== undefined) g.reserveTo = reserveTo || undefined;
  if (memo !== undefined) g.memo = memo || undefined;
  if (host !== undefined) {
    if (host && !g.members.includes(host)) {
      return NextResponse.json({ ok: false, error: 'host not member' }, { status: 400 });
    }
    g.host = host || undefined;
  }

  saveDB(db);
  return NextResponse.json({ ok: true, data: g });
}

