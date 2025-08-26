import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/mockdb';

/* 共通: 時間重複判定 ([s1,e1) と [s2,e2)) */
const overlap = (s1: Date, e1: Date, s2: Date, e2: Date) => !(e1 <= s2 || e2 <= s1);

/* --------------------------- GET ---------------------------
   1) ?slug=<groupSlug>
        -> そのグループの予約一覧を返す（従来の挙動）
           レスポンス: { ok:true, data: reservations[] }
   2) ?deviceId=&start=&end=
        -> 競合チェック（409 ではなく JSON で返す）
           レスポンス: { ok:true, conflicts: [...] }
   3) どちらも無ければ空配列
------------------------------------------------------------ */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  const deviceId = url.searchParams.get('deviceId');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  const db = loadDB();

  if (slug) {
    const g = db.groups.find((x: any) => x.slug === slug);
    if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: g.reservations ?? [] });
  }

  if (deviceId && start && end) {
    const S = new Date(start), E = new Date(end);
    const conflicts = db.groups.flatMap((g: any) =>
      (g.reservations ?? [])
        .filter((r: any) => r.deviceId === deviceId && overlap(new Date(r.start), new Date(r.end), S, E))
        .map((r: any) => {
          const dev = (g.devices ?? []).find((d: any) => d.id === r.deviceId);
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

  return NextResponse.json({ ok: true, data: [] });
}

/* --------------------------- POST ---------------------------
   予約の保存:
   - user はログイン中ユーザーの email に正規化
   - participants に自分を必ず含める
   - 同じ deviceId で時間重複があれば 409 を返す
---------------------------------------------------------------- */
export async function POST(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const db = loadDB();

  const participants: string[] = Array.isArray(body.participants) ? body.participants.slice() : [];
  if (!participants.includes(me.email)) participants.push(me.email);

  const record = {
    ...body,
    id: body.id ?? crypto.randomUUID(),
    user: me.email,
    participants,
    createdAt: new Date().toISOString(),
  };

  const S = new Date(record.start);
  const E = new Date(record.end);

  const conflicts = db.groups.flatMap((g: any) =>
    (g.reservations ?? [])
      .filter((r: any) => r.deviceId === record.deviceId && overlap(new Date(r.start), new Date(r.end), S, E))
  );
  if (conflicts.length) {
    return NextResponse.json({ ok: false, error: 'conflict' }, { status: 409 });
  }

  // 保存先グループ
  const slug = record.groupSlug ?? body.groupSlug ?? new URL(req.url).searchParams.get('slug');
  const g = db.groups.find((x: any) => x.slug === slug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  if (!g.reservations) g.reservations = [];
  g.reservations.push(record);
  saveDB(db);

  return NextResponse.json({ ok: true, data: record });
}

