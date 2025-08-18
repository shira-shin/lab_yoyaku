import { NextResponse } from "next/server";
import { groups, createGroup, publicizeGroup } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json({ groups: groups.map(publicizeGroup) });
}

export async function POST(req: Request) {
  const { name, slug, password } = await req.json();
  if (!name || !slug || !password) {
    return NextResponse.json(
      { error: "name, slug, password は必須" },
      { status: 400 },
    );
  }
  try {
    const g = await createGroup({ name, slug, password });
    return NextResponse.json(
      { group: publicizeGroup(g) },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

