import { NextRequest, NextResponse } from "next/server";
import { groups, devices } from "@/lib/mock-db";
export async function GET(_: NextRequest, { params:{slug} }: any) {
  const g = groups.find(x=>x.slug===slug);
  if(!g) return NextResponse.json({error:"not found"}, {status:404});
  return NextResponse.json({ group: g, devices: devices.filter(d=>d.groupId===g.id) });
}
