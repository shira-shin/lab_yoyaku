import NextAuth from "next-auth";
import Google from "@auth/core/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.VERCEL === "1" || process.env.AUTH_TRUST_HOST === "true",
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ??
        process.env.GOOGLE_CLIENT_ID ??
        "",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ??
        process.env.GOOGLE_CLIENT_SECRET ??
        "",
    }),
  ],
});

export const GET = handlers.GET;
export const POST = handlers.POST;

export const runtime = "nodejs";
