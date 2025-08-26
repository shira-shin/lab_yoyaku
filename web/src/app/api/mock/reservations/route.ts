import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/mockdb';

// 予約の時間が重なるか（[s1,e1) と [s2,e2)）
const overlap = (s1: Date, e1: Date, s2: Date, e2: Date) => !(e1 <= s2 || e2 <= s1);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get('deviceId');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  // 競合確認
  if (deviceId && start && end) {
    const db = loadDB();
    const S = new Date(start), E = new Date(end);
    const conflicts = db.groups.flatMap(g =>
      g.reservations
        .filter(r => r.deviceId === deviceId && overlap(new Date(r.start), new Date(r.end), S, E))
        .map(r => {
          const dev = g.devices.find(d => d.id === r.deviceId);
          return {
            id: r.id,
            deviceName: dev?.name ?? r.deviceId,
            start: r.start,
            end: r.end,
            user: r.user,
            groupSlug: g.slug,
            groupName: g.name,
          };
        })
    );
    return NextResponse.json({ ok: true, conflicts });
  }

  // グループの予約一覧
  const slug = url.searchParams.get('slug');
  if (!slug) return NextResponse.json({ ok: false, error: 'slug required' }, { status: 400 });

  const db = loadDB();
  const deviceFilter = url.searchParams.get('deviceId');
  const g = db.groups.find(g => g.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
  const list = deviceFilter ? g.reservations.filter(r => r.deviceId === deviceFilter) : g.reservations;
  return NextResponse.json({ ok: true, data: list });
}

export async function POST(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });

  const body = await req.json();
  const db = loadDB();

  // 正規化：user はメール、participants に自分を必ず含める
  const participants: string[] = Array.isArray(body.participants) ? body.participants.slice() : [];
  if (!participants.includes(me.email)) participants.push(me.email);

  const payload = {
    ...body,
    id: body.id ?? crypto.randomUUID(),
    user: me.email,
    participants,
    createdAt: new Date().toISOString(),
  } as any;

  // 競合チェック（同一 deviceId で時間重複）
  const S = new Date(payload.start);
  const E = new Date(payload.end);
  const conflicts = db.groups.flatMap(g =>
    g.reservations
      .filter(r => r.deviceId === payload.deviceId && overlap(new Date(r.start), new Date(r.end), S, E))
      .map(r => {
        const dev = g.devices.find(d => d.id === r.deviceId);
        return {
          id: r.id,
          deviceName: dev?.name ?? r.deviceId,
          start: r.start,
          end: r.end,
          user: r.user,
          groupSlug: g.slug,
          groupName: g.name,
        };
      })
  );

  if (conflicts.length) {
    return NextResponse.json({ ok:false, error:'conflict', conflicts }, { status:409 });
  }

  // 保存（グループに追加）
  const g = db.groups.find((x:any)=> x.slug === payload.groupSlug) ?? db.groups[0];
  g.reservations.push(payload);
  saveDB(db);

  return NextResponse.json({ ok:true, data: payload });
}
