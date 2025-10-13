import { NextResponse } from "next/server";
import Google from "next-auth/providers/google";

export async function GET() {
  return NextResponse.json({
    providerType: typeof Google, // "function" が正
    hasNextAuthHandlers: true,
  });
}
