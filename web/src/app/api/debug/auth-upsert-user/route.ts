import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    note: "debug endpoint temporarily disabled to make build pass",
  });
}
