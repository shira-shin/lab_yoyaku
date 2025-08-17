import { NextRequest, NextResponse } from 'next/server';
type R = { uid: string; start: string; end: string; purpose?: string };
let RES: R[] = [];
export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid');
  return NextResponse.json({ reservations: uid ? RES.filter((r) => r.uid === uid) : RES });
}
export async function POST(req: NextRequest) {
  const r = (await req.json()) as R;
  const s = new Date(r.start).getTime(),
    e = new Date(r.end).getTime();
  if (!(s < e))
    return NextResponse.json({ error: '開始は終了より前にしてください' }, { status: 400 });
  const overlap = RES.some(
    (x) => x.uid === r.uid && !(new Date(x.end).getTime() <= s || e <= new Date(x.start).getTime()),
  );
  if (overlap) return NextResponse.json({ error: 'その時間帯は予約済みです' }, { status: 409 });
  RES.unshift(r);
  return NextResponse.json({ ok: true });
}
