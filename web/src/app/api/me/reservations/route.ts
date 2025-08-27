import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB } from '@/lib/mockdb';

const norm = (v?: string) => (v ?? '').trim().toLowerCase();

export async function GET() {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  // 照合キー：email と name の両方（大小無視）
  const meKeys = new Set([norm(me.email), norm(me.name)]);

  // 予約の「このユーザーが関与しているか」判定
  function involved(r: any) {
    const pool: string[] = [];
    if (r.user) pool.push(r.user);
    if (r.userName) pool.push(r.userName);
    if (Array.isArray(r.participants)) pool.push(...r.participants);
    if (Array.isArray(r.participantNames)) pool.push(...r.participantNames);
    return pool.map(norm).some((k) => meKeys.has(k));
  }

  const db = loadDB();
  const mine = (db.groups ?? []).flatMap((g: any) =>
    (g.reservations ?? [])
      .filter(involved)
      .map((r: any) => {
        const dev = (g.devices ?? []).find((d: any) => d.id === r.deviceId);
        return {
          ...r,
          deviceName: dev?.name ?? r.deviceId,
          groupSlug: g.slug,
          groupName: g.name,
        };
      })
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nowSlack = new Date(now.getTime() - 60 * 1000);
  const upcoming = mine.filter((r: any) => {
    const start = new Date(r.start);
    const end = new Date(r.end);
    return end >= nowSlack || start >= today;
  });

  return NextResponse.json({ ok: true, data: upcoming, all: mine });
}

