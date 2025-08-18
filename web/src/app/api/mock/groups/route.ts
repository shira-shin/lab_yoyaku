import { NextRequest, NextResponse } from "next/server";
import { groups } from "@/lib/mock-db";
export async function GET() { return NextResponse.json({ groups }); }

export async function POST(req: NextRequest) {
  const { name, slug } = await req.json();
  if (!name || !slug)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const g = { id: crypto.randomUUID(), name, slug };
  groups.push(g);
  return NextResponse.json({ group: g }, { status: 201 });
}
