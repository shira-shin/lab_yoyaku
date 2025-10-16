import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";

const isVercel = process.env.VERCEL === "1";
const resolvedUrl =
  process.env.AUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: isVercel ? true : process.env.AUTH_TRUST_HOST === "true",
  url: resolvedUrl,
});

export const { GET, POST } = handler;
