import { NextRequest, NextResponse } from "next/server";
import { reservations } from "@/lib/mock-db";
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  const groupId = url.searchParams.get("groupId");
  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  let res = reservations.slice();
  if (deviceId) res = res.filter(r=>r.deviceId===deviceId);
  if (groupId)  res = res.filter(r=>r.groupId===groupId);
  if (from)     res = res.filter(r=>new Date(r.end).getTime()   >= new Date(from).getTime());
  if (to)       res = res.filter(r=>new Date(r.start).getTime() <= new Date(to).getTime());
  return NextResponse.json({ reservations: res });
}
export async function POST(req: NextRequest) {
  const p = await req.json();
  const s = new Date(p.start).getTime(), e = new Date(p.end).getTime();
  if(!(s<e)) return NextResponse.json({error:"開始は終了より前にしてください"}, {status:400});
  const overlap = reservations.some(x=>x.deviceId===p.deviceId && !(new Date(x.end).getTime()<=s || e<=new Date(x.start).getTime()));
  if(overlap) return NextResponse.json({error:"その時間帯は予約済みです"}, {status:409});
  const rec = { id: crypto.randomUUID(), status: "confirmed", ...p };
  reservations.unshift(rec);
  return NextResponse.json({ ok:true, reservation: rec }, {status:201});
}
