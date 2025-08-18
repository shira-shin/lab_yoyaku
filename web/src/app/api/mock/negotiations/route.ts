import { NextRequest, NextResponse } from "next/server";
import { negotiations } from "@/lib/mock-db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get('deviceId');
  let list = negotiations;
  if (deviceId) list = list.filter(n=>n.deviceId===deviceId);
  return NextResponse.json({ negotiations: list });
}

export async function POST(req: NextRequest) {
  const p = await req.json();
  const rec = {
    id: crypto.randomUUID(),
    deviceId: p.deviceId,
    requesterName: p.requesterName,
    message: p.message,
    targetReservationId: p.targetReservationId,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  negotiations.unshift(rec);
  return NextResponse.json({ negotiation: rec }, { status: 201 });
}
