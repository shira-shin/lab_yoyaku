import { NextResponse } from "next/server";
import { devices } from "@/lib/mock-db";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ devices });
}
