import { NextResponse } from "next/server";

import GoogleDefault from "next-auth/providers/google";
import * as GoogleNS from "next-auth/providers/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    typeofDefault: typeof GoogleDefault,
    nsKeys: Object.keys(GoogleNS),
  });
}
