import { NextRequest, NextResponse } from "next/server";
import { negotiations, save } from "@/lib/mock-db";
import type { Negotiation } from "@/lib/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get('deviceId');
  let list = negotiations;
  if (deviceId) list = list.filter(n=>n.deviceId===deviceId);
  return NextResponse.json({ negotiations: list });
}

export async function POST(req: NextRequest) {
  const p = await req.json();
  const rec: Negotiation = {
    id: crypto.randomUUID(),
    deviceId: p.deviceId,
    requesterName: p.requesterName,
    message: p.message,
    targetReservationId: p.targetReservationId,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  negotiations.unshift(rec);
  save();
  return NextResponse.json({ negotiation: rec }, { status: 201 });
}
