import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false }, { status:401 });

  const db = loadDB();
  const isMe = (v?: string) => v === me.email || v === me.name;
  const mine = db.groups.flatMap(g => {
    return g.reservations
      .filter(r => isMe(r.user) || (Array.isArray(r.participants) && r.participants.some(isMe)))
      .map(r => {
        const dev = g.devices.find(d => d.id === r.deviceId);
        return {
          ...r,
          deviceName: dev?.name ?? r.deviceId,
          groupSlug: g.slug,
          groupName: g.name,
        };
      });
  });

  return NextResponse.json({ ok:true, data: mine });
}

