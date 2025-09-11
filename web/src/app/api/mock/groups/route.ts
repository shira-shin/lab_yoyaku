import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { makeSlug } from '@/lib/slug';
import { readUserFromCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = loadDB();
    return NextResponse.json({ ok: true, data: db.groups });
  } catch (e: any) {
    console.error('list groups failed', e);
    return NextResponse.json(
      { error: e?.message ?? 'list groups failed' },
      { status: e?.status ?? 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name, password, slug, reserveFrom, reserveTo, memo } = await req.json();
    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'invalid request' },
        { status: 400 }
      );
    }
    const db = loadDB();
    const s = makeSlug(slug || name);
    if (db.groups.find((g: any) => g.slug === s)) {
      return NextResponse.json(
        { ok: false, error: 'slug already exists' },
        { status: 409 }
      );
    }

    const me = await readUserFromCookie().catch(() => null);

    const g = {
      slug: s,
      name,
      password: password || undefined,
      members: me?.email ? [me.email] : [],
      devices: [],
      reservations: [],
      reserveFrom: reserveFrom || undefined,
      reserveTo: reserveTo || undefined,
      memo: memo || undefined,
      host: me?.email,
    } as any;
    db.groups.push(g);
    saveDB(db);
    return NextResponse.json(
      { ok: true, group: { slug: g.slug, name: g.name } },
      { status: 201 }
    );
  } catch (e: any) {
    console.error('create group failed', e);
    return NextResponse.json(
      { error: e?.message ?? 'create group failed' },
      { status: e?.status ?? 500 }
    );
  }
}

