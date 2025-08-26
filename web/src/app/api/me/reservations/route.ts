import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false }, { status:401 });

  const isMe = (v?:string) => !!v && (v === me.email || v === me.name);
  const db = loadDB();

  const mine = db.groups.flatMap(g =>
    g.reservations
      .filter(r => isMe(r.user) || (Array.isArray(r.participants) && r.participants.some(isMe)))
      .map(r => {
        const dev = g.devices.find(d => d.id === r.deviceId);
        return {
          ...r,
          deviceName: dev?.name ?? r.deviceId,
          groupSlug: g.slug,
          groupName: g.name,
        };
      })
  );

  // 直近（終了が今-1分以降）
  const nowSlack = Date.now() - 60 * 1000;
  const upcoming = mine.filter(r => new Date(r.end).getTime() >= nowSlack);

  return NextResponse.json({ ok:true, data: upcoming });
}
