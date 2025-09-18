export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { readUserFromCookie } from '@/lib/auth';
import { loadDB, saveDB } from '@/lib/mockdb';

export const runtime = 'nodejs';

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
  const add = (v?:string)=> { const x=(v??'').trim(); if(x && !participants.includes(x)) participants.push(x); };
  add(me.email);
  add(me.name);

  const record = {
    ...body,
    id: body.id ?? crypto.randomUUID(),
    user: me.email,
    userName: me.name ?? me.email,
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

  sendReminderEmail(record).catch((e) => console.error('reminder mail failed', e));

  return NextResponse.json({ ok: true, data: record });
}

/* --------------------------- PATCH ---------------------------
   Update reservation fields (currently reminderMinutes only)
------------------------------------------------------------ */
export async function PATCH(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, groupSlug, reminderMinutes } = body || {};
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === groupSlug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  const r = (g.reservations ?? []).find((x: any) => x.id === id);
  if (!r) return NextResponse.json({ ok: false, error: 'reservation not found' }, { status: 404 });
  if (r.user !== me.email) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  if (reminderMinutes === null || reminderMinutes === undefined) {
    delete r.reminderMinutes;
  } else {
    r.reminderMinutes = reminderMinutes;
  }
  saveDB(db);
  return NextResponse.json({ ok: true, data: r });
}

/* --------------------------- DELETE ---------------------------
   Cancel reservation (only owner can delete)
------------------------------------------------------------ */
export async function DELETE(req: Request) {
  const me = await readUserFromCookie();
  if (!me) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, groupSlug } = body || {};
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const db = loadDB();
  const g = db.groups.find((x: any) => x.slug === groupSlug);
  if (!g) return NextResponse.json({ ok: false, error: 'group not found' }, { status: 404 });

  const idx = (g.reservations ?? []).findIndex((x: any) => x.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: 'reservation not found' }, { status: 404 });
  const r = g.reservations[idx];
  if (r.user !== me.email) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  g.reservations.splice(idx, 1);
  saveDB(db);
  return NextResponse.json({ ok: true });
}

async function sendReminderEmail(record: any) {
  const to = record.user;
  const subject = '予約確認';
  const text = `以下の内容で予約を受け付けました\n機器: ${record.deviceId}\n開始: ${record.start}\n終了: ${record.end}`;
  try {
    if (process.env.MAIL_WEBHOOK) {
      await fetch(process.env.MAIL_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to, subject, text }),
      });
    } else {
      console.log('reminder mail to', to, text);
    }
  } catch (e) {
    console.error(e);
  }
}

