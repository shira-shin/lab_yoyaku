import { NextResponse } from "next/server";
import { joinGroup, publicizeGroup } from "@/lib/mock-db";

export async function POST(req: Request) {
  const { group, password } = await req.json(); // group = name or slug
  if (!group || !password) {
    return NextResponse.json(
      { error: "group, password は必須" },
      { status: 400 },
    );
  }
  try {
    const g = await joinGroup(group, password);
    return NextResponse.json(
      { group: publicizeGroup(g) },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
}

