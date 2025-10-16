import { NextResponse } from "next/server";
import Google from "@auth/core/providers/google";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ providerType: typeof Google, hasNextAuthHandlers: true });
}
