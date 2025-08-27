import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

const norm = (v?:string) => (v ?? '').trim().toLowerCase();

// 予約の「このユーザーが関与しているか」判定
function involved(r:any, meKeys:Set<string>) {
  const pool:string[] = [];
  if (r.user) pool.push(r.user);
  if (r.userName) pool.push(r.userName);
  if (Array.isArray(r.participants)) pool.push(...r.participants);
  // 将来の互換用フィールドがあっても拾えるように
  if (Array.isArray(r.participantNames)) pool.push(...r.participantNames);
  return pool.map(norm).some(k => meKeys.has(k));
}

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false }, { status:401 });

  // 照合キー：email と name の両方（大小無視）
  const meKeys = new Set([norm(me.email), norm(me.name)]);

  const db = loadDB();
  const mine = (db.groups ?? []).flatMap((g:any) => {
    const reservations = g.reservations ?? [];
    const withDevice = reservations.map((r:any) => {
      const dev = (g.devices ?? []).find((d:any)=> d.id === r.deviceId);
      return {
        ...r,
        deviceName: dev?.name ?? r.deviceId,
        groupSlug: g.slug,
        groupName: g.name,
      };
    });
    return withDevice.filter((r:any)=> involved(r, meKeys));
  });

  // 「直近」= 終了が今-1分 以降（タイムゾーン誤差のバッファ）
  const nowSlack = Date.now() - 60*1000;
  const upcoming = mine.filter((r:any)=> new Date(r.end).getTime() >= nowSlack);

  // 右側の月カレンダー用に全件も返すと後段のUIが楽になる
  return NextResponse.json({ ok:true, data: upcoming, all: mine });
}

