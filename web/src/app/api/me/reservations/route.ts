import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false }, { status:401 });

  const meKeys = [me.email, me.name].filter(Boolean);
  const isMe = (v?:string)=> !!v && meKeys.includes(v);

  const db = loadDB();

  const mine = db.groups.flatMap(g =>
    (g.reservations ?? [])
      .filter(r => isMe(r.user) || (Array.isArray(r.participants) && r.participants.some(isMe)))
      .map(r => {
        const dev = (g.devices ?? []).find(d=>d.id===r.deviceId);
        return {
          ...r,
          deviceName: dev?.name ?? r.deviceId,
          groupSlug: g.slug,
          groupName: g.name,
        };
      })
  );

  // “終了が今-1分以降”だけ返す（過去で欠落しないよう微調整）
  const nowSlack = Date.now() - 60*1000;
  return NextResponse.json({ ok:true, data: mine.filter(r => new Date(r.end).getTime() >= nowSlack) });
}
