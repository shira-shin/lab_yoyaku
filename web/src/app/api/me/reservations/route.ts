import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

  const db = loadDB();
  const mine = db.groups.flatMap(g => {
    return g.reservations
      .filter(r => r.user === me.email || r.user === me.name) // ← user はメール推奨
      .map(r => {
        const dev = g.devices.find(d => d.id === r.deviceId);
        return {
          ...r,
          deviceName: dev?.name ?? r.deviceId,   // ← 機器名を同梱
          groupSlug: g.slug,
          groupName: g.name,
        };
      });
  });

  return NextResponse.json({ ok:true, data: mine });
}

