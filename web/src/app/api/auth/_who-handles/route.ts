import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ handler: "app-v5" });
}

export const runtime = "nodejs";
