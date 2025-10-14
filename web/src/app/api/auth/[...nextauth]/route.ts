export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { GET, POST } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
});
