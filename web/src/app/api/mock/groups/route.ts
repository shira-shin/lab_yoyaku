export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { loadDB, saveDB } from '@/lib/mockdb';
import { makeSlug } from '@/lib/slug';
import { readUserFromCookie } from '@/lib/auth-legacy';


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get('mine') === '1';
    const db = loadDB();
    let groups = db.groups as any[];
    if (mine) {
      const me = await readUserFromCookie().catch(() => null);
      if (!me?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      groups = groups.filter((g) => Array.isArray(g.members) && g.members.some((m: any) => m === me.email));
    }
    return NextResponse.json({ groups });
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
    if (!me?.email) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const g = {
      slug: s,
      name,
      password: password || undefined,
      members: [me.email],
      devices: [],
      reservations: [],
      reserveFrom: reserveFrom || undefined,
      reserveTo: reserveTo || undefined,
      memo: memo || undefined,
      host: me.email,
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

