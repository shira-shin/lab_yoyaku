import { NextResponse } from "next/server";

import Google from "next-auth/providers/google";
import { appBaseUrl } from "@/lib/http/base-url";

const shouldTrustHost =
  process.env.AUTH_TRUST_HOST === "true" ||
  process.env.AUTH_TRUST_HOST === "1" ||
  process.env.NODE_ENV !== "production";

export async function GET() {
  return NextResponse.json({
    providerType: typeof Google,
    hasNextAuthHandlers: true,
    vercel: process.env.VERCEL === "1",
    vercelUrl: process.env.VERCEL_URL,
    appBaseUrl,
    authUrl: process.env.AUTH_URL ?? null,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    trustHost: shouldTrustHost,
    hasGoogleClientId: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    hasSecret: !!process.env.AUTH_SECRET,
    authTrustHost: process.env.AUTH_TRUST_HOST ?? null,
    trustHostEffective: shouldTrustHost,
  });
}
