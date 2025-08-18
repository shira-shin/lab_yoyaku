import { NextRequest, NextResponse } from "next/server";
import { groups } from "@/lib/mock-db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const g = groups.find((x) => x.slug === code);
  if (!g) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, group: g });
}
