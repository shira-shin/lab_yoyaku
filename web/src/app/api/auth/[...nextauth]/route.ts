import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const auth = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.APP_AUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
});

export async function GET(req: NextRequest) {
  return auth(req);
}

export async function POST(req: NextRequest) {
  return auth(req);
}

export const runtime = "nodejs";
