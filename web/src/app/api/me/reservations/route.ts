import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

  const db = loadDB();
  // 予約の user は「メール」想定（以前のモックが表示名ならそちらに揃えてOK）
  const mine = db.groups.flatMap(g =>
    g.reservations
      .filter(r => r.user === me.email || r.user === me.name)
      .map(r => ({ ...r, groupSlug: g.slug, groupName: g.name }))
  );

  return NextResponse.json({ ok:true, data: mine });
}
