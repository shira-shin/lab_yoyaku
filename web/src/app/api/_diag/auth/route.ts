import { NextResponse } from "next/server";

import Google from "next-auth/providers/google";
import { appBaseUrl } from "@/lib/http/base-url";

export async function GET() {
  return NextResponse.json({
    providerType: typeof Google,
    hasNextAuthHandlers: true,
    vercel: process.env.VERCEL === "1",
    vercelUrl: process.env.VERCEL_URL,
    appBaseUrl,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    trustHost: true,
    hasGoogleId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    hasSecret: !!process.env.APP_AUTH_SECRET,
  });
}
