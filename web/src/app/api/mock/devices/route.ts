import { NextRequest, NextResponse } from "next/server";
import { devices, groups } from "@/lib/mock-db";

export async function POST(req: NextRequest) {
  const p = await req.json();
  const g = groups.find((x) => x.slug === p.groupSlug || x.id === p.groupId);
  if (!g) return NextResponse.json({ error: 'group not found' }, { status: 404 });
  const device = {
    id: crypto.randomUUID(),
    device_uid: p.device_uid ?? `DEV-${Math.random().toString(36).slice(2,8)}`,
    name: p.name,
    category: p.category,
    location: p.location,
    status: 'available',
    sop_version: Number(p.sop_version) || 1,
    groupId: g.id,
  };
  devices.push(device);
  return NextResponse.json({ device }, { status: 201 });
}
